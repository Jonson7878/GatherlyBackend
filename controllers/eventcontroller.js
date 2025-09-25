import { response } from 'express';
import User from '../models/userModel.js'
import Event from '../models/eventModel.js';
import Company from "../models/companyModel.js";

import moment from "moment-timezone";

import mongoose from 'mongoose';


// Step 1: Create event
export const createEvent = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: false, message: 'Please upload an image.' });
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ status: false, message: 'Only JPEG, JPG, and PNG files are allowed.' });
    }

    const { eventName, description, view } = req.body;
    const base64Image = Buffer.from(req.file.buffer).toString('base64');
    const imageData = `data:${req.file.mimetype};base64,${base64Image}`;

    const existingEvent = await Event.findOne({ eventName });
    if (existingEvent) {
      return res.status(400).json({ status: false, message: 'Event with this name already exists.' });
    }

    const newEvent = new Event({
      eventName,
      description,
      view,
      image: imageData,
      createdBy: req.user.id,
    });

    await newEvent.save();

    return res.status(201).json({
      status: true,
      message: 'Event basic info. Added successfully.',
      event: newEvent,
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ status: false, message: 'Server error while creating event.' });
  }
};

  
// Step 2: Add Event Details
export const addEventDetails = async (req, res) => {
    try {
        const { eventId, quantity, dateTime, location } = req.body;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        if (!moment(dateTime, moment.ISO_8601, true).isValid()) {
            return res.status(400).json({ message: "Invalid date format. Use ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)." });
        }

        const formattedDateTime = moment.tz(dateTime, "Asia/Kolkata").toISOString();

        event.quantity = quantity;
        event.dateTime = formattedDateTime;
        event.location = location;

        await event.save();

        const formattedDate = moment(formattedDateTime).tz("Asia/Kolkata").format("MM/DD/YYYY");
        const formattedTime = moment(formattedDateTime).tz("Asia/Kolkata").format("HH:mm");

        return res.status(200).json({
            message: "Event details added successfully",
            event: {
                ...event.toObject(),
                formattedDateTime: `${formattedDate} ${formattedTime} IST`,
            },
        });
    } catch (err) {
        console.error("Error adding event details:", err);
        return res.status(500).json({ message: "Server error while adding event details." });
    }
};

// Step 3: Add Tickets
export const addTickets = async (req, res) => {
    try {
        const { eventId, tickets } = req.body;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        if (!event.quantity) {
            return res.status(400).json({ message: "Event quantity has not been set" });
        }

        const existingTicketsTotal = event.tickets ? 
            event.tickets.reduce((sum, ticket) => {
                const ticketQty = Number(ticket.quantity) || 0;
                return sum + (Number.isInteger(ticketQty) ? ticketQty : 0);
            }, 0) : 0;

        const newTicketsTotal = tickets.reduce((sum, ticket) => sum + Number(ticket.quantity), 0);
        const totalQuantity = existingTicketsTotal + newTicketsTotal;

        if (totalQuantity > event.quantity) {
            return res.status(400).json({ 
                message: `Total ticket quantity (${totalQuantity}) exceeds event capacity (${event.quantity})`,
                availableQuantity: event.quantity - existingTicketsTotal
            });
        }

        if (!Array.isArray(event.tickets)) {
            event.tickets = [];
        }

        event.tickets.push(...tickets);

        await event.save();
        res.status(200).json({ message: "Tickets added successfully", event });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Step 4: Add FAQs
  export const addFaqs = async (req, res) => {
    try {
      const { eventId, faqs } = req.body;
  
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
  
      event.faqs = faqs;
  
      await event.save();
      res.status(200).json({ message: "Event added faqs successfully", event });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  //all event 
export const getCompanyEvents = async (req, res) => {
 try {
    let query = {};

    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      query = { createdBy: req.user.id };
    }

    const events = await Event.find(query)
      .select('eventName dateTime location image createdBy view')
      .populate({
        path: 'createdBy',
        select: 'username companyId',
        populate: {
          path: 'companyId',
          select: 'name',
        },
      });
      
    return res.status(200).json({ events });
  } catch (err) {
    console.error('Error fetching events:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// export const getCompanyEvents = async (req, res) => {
//   try {
//     let query = {};

//     if (req.user.role !== 'admin' && req.user.role !== 'manager') {
//       query = { createdBy: req.user.id };
//     }

//     // Step 1: Get events (lean for performance)
//     const events = await Event.find(query)
//       .select('eventName dateTime location image createdBy view')
//       .lean();

//     // Step 2: Collect all user IDs from events
//     const userIds = [...new Set(events.map(event => event.createdBy?.toString()))];

//     // Step 3: Fetch all users
//     const users = await User.find({ _id: { $in: userIds } })
//       .select('username companyId')
//       .lean();

//     // Step 4: Collect all company IDs
//     const companyIds = [...new Set(users.map(user => user.companyId?.toString()).filter(Boolean))];

//     // Step 5: Fetch all companies
//     const companies = await Company.find({ _id: { $in: companyIds } })
//       .select('name')
//       .lean();

//     // Step 6: Create maps
//     const userMap = {};
//     users.forEach(user => {
//       userMap[user._id.toString()] = user;
//     });

//     const companyMap = {};
//     companies.forEach(company => {
//       companyMap[company._id.toString()] = company;
//     });

//     // Step 7: Attach user and company info to each event
//     const enrichedEvents = events.map(event => {
//       const user = userMap[event.createdBy?.toString()];
//       const company = user?.companyId ? companyMap[user.companyId.toString()] : null;

//       return {
//         ...event,
//         createdBy: user
//           ? {
//               _id: user._id,
//               username: user.username,
//               companyId: company ? { _id: company._id, name: company.name } : null,
//             }
//           : null,
//       };
//     });

//     return res.status(200).json({ events: enrichedEvents });
//   } catch (err) {
//     console.error('Error fetching events:', err);
//     return res.status(500).json({ message: 'Server error' });
//   }
// };


// Get all event by company
export const getAllEvents = async (req, res) => {
  try {
    const userCompanyId = req.user.companyId;

    if (!userCompanyId) {
      return res.status(400).json({ message: 'Missing company ID in user token' });
    }

    const events = await Event.find({
      $or: [
        { view: 'public' },
        { view: 'private' }
      ]
    })
    .select('eventName dateTime location image createdBy view')
    .populate({
      path: 'createdBy',
      select: 'username companyId',
      populate: {
        path: 'companyId',
        select: 'name',
      },
    });

    const filteredEvents = events.filter(event =>
      event.view === 'public' ||
      (event.createdBy?.companyId?._id?.toString() === userCompanyId.toString())
    );

    return res.status(200).json({ events: filteredEvents });
  } catch (err) {
    console.error('Error fetching events:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update Step 1
export const updateEventBasic = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { eventName, description, view } = req.body;

    const userId = req.user?.id?.toString();
    const userRole = req.user?.role;
    const userCompanyId = req.user?.companyId?.toString();

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ status: false, message: "Invalid event ID." });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ status: false, message: "Event not found." });

    // Get event creator info to check companyId
    const eventCreator = await User.findById(event.createdBy).select('companyId role');

    const isOwner = event.createdBy?.toString() === userId;
    const isSameCompanyAdminOrManager =
      (userRole === "admin" || userRole === "manager") &&
      eventCreator?.companyId?.toString() === userCompanyId;

    if (!isOwner && !isSameCompanyAdminOrManager) {
      return res.status(403).json({ status: false, message: "Not authorized to update this event." });
    }

    if (eventName) event.eventName = eventName;
    if (description) event.description = description;
    if (view) event.view = view;

    if (req.file) {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ status: false, message: 'Only JPEG, JPG, PNG files are allowed.' });
      }
      const base64Image = Buffer.from(req.file.buffer).toString('base64');
      event.image = `data:${req.file.mimetype};base64,${base64Image}`;
    }

    await event.save();
    return res.status(200).json({ status: true, message: "Event basic info updated.", event });

  } catch (err) {
    console.error("Error updating event basic info:", err);
    res.status(500).json({ status: false, message: "Server error while updating event." });
  }
};


// Update step 2
export const updateEventDetails = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { quantity, dateTime, location } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (dateTime && !moment(dateTime, moment.ISO_8601, true).isValid()) {
      return res.status(400).json({ message: "Invalid date format. Use ISO 8601." });
    }

    if (quantity !== undefined) event.quantity = quantity;
    if (dateTime) event.dateTime = moment.tz(dateTime, "Asia/Kolkata").toISOString();
    if (location) event.location = location;

    await event.save();

    const formattedDate = moment(event.dateTime).tz("Asia/Kolkata").format("MM/DD/YYYY");
    const formattedTime = moment(event.dateTime).tz("Asia/Kolkata").format("HH:mm");

    return res.status(200).json({
      message: "Event details updated successfully",
      event: {
        ...event.toObject(),
        formattedDateTime: `${formattedDate} ${formattedTime} IST`,
      },
    });
  } catch (err) {
    console.error("Error updating event details:", err);
    return res.status(500).json({ message: "Server error while updating event details." });
  }
};

// Update step 3
export const updateEventTickets = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { tickets } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!Array.isArray(event.tickets)) {
      event.tickets = [];
    }

    const ticketMap = new Map(
      event.tickets.map(ticket => [ticket._id.toString(), ticket])
    );

    for (const incomingTicket of tickets) {
      if (incomingTicket._id && ticketMap.has(incomingTicket._id)) {
        const existingTicket = ticketMap.get(incomingTicket._id);
        existingTicket.ticketName = incomingTicket.ticketName;
        existingTicket.description = incomingTicket.description;
        existingTicket.price = incomingTicket.price;
        existingTicket.quantity = incomingTicket.quantity;
      } else {
        event.tickets.push(incomingTicket);
      }
    }

    await event.save();

    res.status(200).json({
      message: "Update Tickets successfully",
      event,
    });

  } catch (err) {
    console.error("Error updating tickets:", err);
    res.status(500).json({ message: "Server error while updating tickets." });
  }
};

// Update ticket update 
export const updateSingleEventTicket = async (req, res) => {
  try {
    const { eventId, ticketId } = req.params;
    const { ticketName, description, price, quantity } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const ticket = event.tickets.id(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    ticket.ticketName = ticketName ?? ticket.ticketName;
    ticket.description = description ?? ticket.description;
    ticket.price = price ?? ticket.price;
    ticket.quantity = quantity ?? ticket.quantity;

    await event.save();

    res.status(200).json({
      message: "Ticket updated successfully",
      ticket,
    });
  } catch (err) {
    console.error("Error updating ticket:", err);
    res.status(500).json({ message: "Server error while updating ticket." });
  }
};

// created ticket delete
export const deleteEventTicket = async (req, res) => {
  try {
    const { eventId, ticketId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.tickets = event.tickets.filter(
      (ticket) => ticket._id.toString() !== ticketId
    );

    await event.save();

    res.status(200).json({ message: "Ticket deleted successfully", event });
  } catch (err) {
    console.error("Error deleting ticket:", err);
    res.status(500).json({ message: "Server error while deleting ticket" });
  }
};

// Update step 4
export const updateEventFaqs = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { faqs } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    event.faqs = faqs;

    await event.save();
    res.status(200).json({ message: "FAQs updated successfully", event });
  } catch (err) {
    console.error("Error updating FAQs:", err);
    res.status(500).json({ message: "Server error while updating FAQs." });
  }
};

// created feqs update
export const updateSingleEventFaq = async (req, res) => {
  const { eventId, faqId } = req.params;
  const { title, description } = req.body;

  try {
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const faqIndex = event.faqs.findIndex((faq) => faq._id.toString() === faqId);
    if (faqIndex === -1) return res.status(404).json({ message: "FAQ not found" });

    event.faqs[faqIndex].title = title;
    event.faqs[faqIndex].description = description;

    await event.save();

    res.status(200).json({ faq: event.faqs[faqIndex] });
  } catch (err) {
    console.error("Error updating FAQ:", err);
    res.status(500).json({ message: "Server error" });
  }
};


//created feqs delete
export const deleteEventFaq = async (req, res) => {
  try {
    const { eventId, faqId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.faqs = event.faqs.filter(
      (faq) => faq._id.toString() !== faqId
    );

    await event.save();

    res.status(200).json({ message: "FAQ deleted successfully", event });
  } catch (err) {
    console.error("Error deleting FAQ:", err);
    res.status(500).json({ message: "Server error while deleting FAQ." });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id?.toString();
    const userRole = req.user?.role;
    const userCompanyId = req.user?.companyId?.toString();

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ status: false, message: "Invalid event ID." });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ status: false, message: "Event not found." });
    }

    const eventCreator = await User.findById(event.createdBy).select('companyId role');
    const isOwner = event.createdBy?.toString() === userId;
    const isSameCompanyAdmin =
      userRole === "admin" &&
      eventCreator?.companyId?.toString() === userCompanyId;

    if (!isOwner && !isSameCompanyAdmin) {
      return res.status(403).json({ status: false, message: "You are not authorized to delete this event." });
    }

    await Event.findByIdAndDelete(eventId);

    return res.status(200).json({ status: true, message: "Event deleted successfully." });
  } catch (error) {
    console.error("Error deleting event:", error);
    return res.status(500).json({ status: false, message: "Server error during event deletion." });
  }
};



// export const getCompanyEvents = async (req, res) => {
//   try {
//     let query = {};

//     if (req.user.role !== 'admin' && req.user.role !== 'manager') {
//       query = { createdBy: req.user.id };
//     }

//     const events = await Event.find(query)
//       .select('eventName dateTime location image createdBy view')
//       .populate({
//         path: 'createdBy',
//         select: 'username companyId',
//       })
//       .lean();

//     return res.status(200).json({ events });
//   } catch (err) {
//     console.error('Error fetching events:', err);
//     return res.status(500).json({ message: 'Server error' });
//   }
// };


export const buyTicket = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticketName, quantity } = req.body;

    if (!ticketName || !quantity) {
      return res.status(400).json({ message: "Ticket name and quantity are required" });
    }

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({ message: "Quantity must be a positive integer" });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const ticket = event.tickets.find((t) => t.ticketName === ticketName);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.quantity < quantity) {
      return res.status(400).json({ message: "Not enough tickets available" });
    }

    ticket.quantity -= quantity;
    await event.save();

    res.status(200).json({ message: "Ticket purchased successfully", event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// getevent by company id
export const getEventsByCompanyId = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }
    const users = await User.find({ companyId }).select('_id');

    const userIds = users.map(user => user._id);

    const events = await Event.find({ createdBy: { $in: userIds } })
      .select('eventName dateTime location image createdBy view')
      .populate({
        path: 'createdBy',
        select: 'username companyId',
        populate: {
          path: 'companyId',
          select: 'name',
        },
      });

    return res.status(200).json({ events });
  } catch (err) {
    console.error('Error fetching events by company ID:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get Single event 
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



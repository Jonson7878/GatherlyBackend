import Order from "../models/orderModel.js";
import Event from '../models/eventModel.js';
import PromoCode from "../models/promoCodeModel.js"

export const createOrderSummary = async (req, res) => {
  try {
    const { eventId, tickets } = req.body;

    if (!eventId || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Event ID and tickets are required",
      });
    }

    if (!req.user?.companyId) {
      return res.status(400).json({
        status: false,
        message: "User's company ID not found",
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        status: false,
        message: "Event not found",
      });
    }

    const validTicketIds = event.tickets.map((t) => t._id.toString());

    for (let ticket of tickets) {
      const { ticketId, ticketName, quantity, amount } = ticket;

      if (
        ticketId == null ||
        ticketName == null ||
        quantity == null ||
        amount == null
      ) {
        return res.status(400).json({
          status: false,
          message: "All fields in each ticket are required",
        });
      }

      if (typeof quantity !== "number" || quantity <= 0) {
        return res.status(400).json({
          status: false,
          message: `Quantity must be a positive number for ticket ${ticketName}`,
        });
      }

      if (typeof amount !== "number" || amount < 0) {
        return res.status(400).json({
          status: false,
          message: `Amount must be a non-negative number for ticket ${ticketName}`,
        });
      }

      if (!validTicketIds.includes(ticketId)) {
        return res.status(400).json({
          status: false,
          message: `Ticket ID ${ticketId} is not valid for this event`,
        });
      }

      const eventTicket = event.tickets.find(
        (t) => t._id.toString() === ticketId
      );

      if (!eventTicket) {
        return res.status(400).json({
          status: false,
          message: `Ticket with ID ${ticketId} not found in event`,
        });
      }

      if (eventTicket.quantity < quantity) {
        return res.status(400).json({
          status: false,
          message: `Not enough tickets available for ${eventTicket.ticketName}`,
        });
      }

      eventTicket.quantity -= quantity;
    }

    await event.save();

    const totalAmount = tickets.reduce(
      (sum, t) => sum + t.quantity * t.amount,
      0
    );

    const order = await Order.create({
      eventId,
      tickets,
      totalAmount,
      userId: req.user.id,
      companyId: req.user.companyId,
      paymentStatus: "Pending",
    });

    return res.status(201).json({
      status: true,
      message: "Order created successfully!",
      order,
      remainingTickets: event.tickets,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};


// export const getAllorders = async (req, res) => {
//     try {
//         if (!req.user || req.user.role !== 'admin') {
//             return res.status(403).json({
//                 status: false,
//                 message: "Access denied. Admins only."
//             });
//         }

//         const orders = await Order.find()
//             .populate({
//                 path: "eventId",
//                 select: "eventName"
//             })
//             .populate({
//                 path: "userId",
//                 select: "username"
//             })
//             .populate({
//               path: "companyId",
//               select: "name"

//             })

//         return res.status(200).json({
//             status: true,
//             message: "All Orders fetched successfully!",
//             Orders: orders,
//         });

//     } catch (err) {
//         return res.status(500).json({
//             status: false,
//             message: "Something went wrong"
//         });
//     }
// };

export const getAllorders = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        status: false,
        message: "Access denied. Admins only."
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalCount = await Order.countDocuments();
    const orders = await Order.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: "eventId",
        select: "eventName"
      })
      .populate({
        path: "userId",
        select: "username"
      })
      .populate({
        path: "companyId",
        select: "name"
      });

    return res.status(200).json({
      status: true,
      message: "Orders fetched successfully!",
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalOrders: totalCount,
        }
      },
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Something went wrong"
    });
  }
};

export const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { tickets, paymentStatus } = req.body;

        if (!Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({
                status: false,
                message: "Tickets are required and must be a non-empty array.",
            });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Order not found.",
            });
        }

        if (String(req.user?.id) !== String(order.userId) && req.user?.role !== "admin") {
            return res.status(403).json({
                status: false,
                message: "You are not authorized to update this order.",
            });
        }

        const event = await Event.findById(order.eventId);
        if (!event) {
            return res.status(404).json({
                status: false,
                message: "Associated event not found.",
            });
        }

        const updatedTickets = tickets.map(newTicket => {
            const existingTicket = order.tickets.find(t => String(t.ticketId) === String(newTicket.ticketId));
            const eventTicket = event.tickets.find(t => String(t._id) === String(newTicket.ticketId));

            if (!existingTicket || !eventTicket) {
                throw new Error(`Invalid ticket ID: ${newTicket.ticketId}`);
            }

            const quantityDiff = newTicket.quantity - (existingTicket.quantity || 0);
            if (quantityDiff > 0 && eventTicket.quantity < quantityDiff) {
                throw new Error(`Not enough tickets available for ${eventTicket.ticketName}`);
            }

            eventTicket.quantity -= quantityDiff;

            return {
                ...existingTicket,
                ...newTicket,
                ticketName: eventTicket.ticketName,
                amount: eventTicket.price,
            };
        });

        const totalAmount = updatedTickets.reduce((sum, t) => sum + (t.quantity * t.amount), 0);

        order.tickets = updatedTickets;
        order.totalAmount = totalAmount;
        
        await event.save();
        if (paymentStatus) {
            order.paymentStatus = paymentStatus;
        }

        await order.save();

        return res.status(200).json({
            status: true,
            message: "Order updated successfully.",
            order,
        });

    } catch (err) {
        console.error("Error updating order:", err);
        return res.status(500).json({
            status: false,
            message: "Server error.",
        });
    }
};

export const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ status: false, message: "Order not found" });
        }

        if (order.userId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ status: false, message: "You can only delete your own orders." });
        }

        const event = await Event.findById(order.eventId);
        if (event && Array.isArray(event.tickets)) {
            for (const orderedTicket of order.tickets || []) {
                const eventTicket = event.tickets.find(
                    (t) => String(t._id) === String(orderedTicket.ticketId)
                );
                if (eventTicket && typeof orderedTicket.quantity === "number") {
                    eventTicket.quantity += orderedTicket.quantity;
                }
            }
            await event.save();
        }

        await Order.findByIdAndDelete(req.params.id);
        return res.status(200).json({ status: true, message: "Order deleted successfully." });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Server error.", error: error.message });
    }
};

// export const getEventWithAmount = async (req,res) =>{
//     try{
//         const{eventId,tickets,promoCode} = req.body;
//         if(!eventId){
//             return res.status(400).json({
//                 status:false, 
//                 message:"eventId required."
//             })
//         }
//         if(!Array.isArray(tickets) || tickets.length === 0){
//             return res.status(400).json({
//                 status:false,
//                 message:"Tickets are required."
//             })
//         }
//         if(!promoCode){
//             return res.status(400).json({
//                 status:false, 
//                 message:"Promo Code required."
//             })
//         }
//         let totalAmount= tickets.reduce((sum,t) => sum + (t.quantity * t.amount),0)
//         let  discount=0;
//         let finalAmount= totalAmount
//         if(promoCode){
//             const promo= await PromoCode.findOne({code:promoCode})
//             if(!promo){
//                 return res.status(404).json({
//                     status:false, 
//                     message:"Promocode not found."
//                 })
//             }
//         if(promo.expiresAt && new Date() > promo.expiresAt){
//             return res.status(400).json({
//                 status: false, 
//                 message:"PromoCode expired."
//             })
//         }
//         if(promo.discountType === "flat"){
//             discount= promo.discountAmount;
//         } else if(promo.discountType === "percent"){
//             discount= (promo.discountAmount/100)* totalAmount
//         }
//         finalAmount= totalAmount-discount;
//         if(finalAmount < 0) finalAmount = 0
//         }
//         return res.status(200).json({
//             status:true,
//             message:"Order Preview calculated successfully.",
//             data:{
//                 eventId,
//                 tickets,
//                 totalAmount,
//                 discount,
//                 finalAmount
//             }
//         })
//     }catch(error){
//         console.error("Get Event Total Error:", error)
//         return res.status(500).json({
//             status:false,
//             message:"Server error"
//         })
//     }
// }

export const getEventWithAmount = async (req, res) => {
  try {
    const { orderId, promoCode } = req.body;

    if (!orderId) {
      return res.status(400).json({
        status: false,
        message: "Order ID is required.",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found.",
      });
    }

    const { eventId, tickets } = order;

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No tickets found in the order.",
      });
    }

    let totalAmount = tickets.reduce((sum, t) => sum + (t.quantity * t.amount), 0);
    let discount = 0;
    let finalAmount = totalAmount;

    if (promoCode) {
      const promo = await PromoCode.findOne({ code: promoCode });

      if (!promo) {
        return res.status(404).json({
          status: false,
          message: "Promo code not found.",
        });
      }

      if (promo.expiresAt && new Date() > promo.expiresAt) {
        return res.status(400).json({
          status: false,
          message: "Promo code expired.",
        });
      }

      if (promo.discountType === "flat") {
        discount = promo.discountAmount;
      } else if (promo.discountType === "percent") {
        discount = (totalAmount * promo.discountAmount) / 100;
      }

      finalAmount = totalAmount - discount;
    }

    return res.status(200).json({
      status: true,
      message: "Amount calculation successful.",
      data: {
        totalAmount,
        discount,
        finalAmount
      }
    });
  } catch (error) {
    console.error("Error calculating event amount:", error);
    return res.status(500).json({
      status: false,
      message: "Server error."
    });
  }
};

export const getUserOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId, paymentStatus: "Pending" })
      .populate("eventId", "eventName dateTime location")
      .populate("userId", "username")
      .populate("companyId", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "User order history fetched successfully.",
      data: orders.map(order => ({
        ...order._doc,
        paymentStatus: order.paymentStatus,
      }))
    });
  } catch (error) {
    console.error("User order History Error:", error);
    return res.status(500).json({ status: false, message: "Server Error" });
  }
};

export const getCompletedOrders = async (req,res) => {
  try{
    const {orderId} = req.params;

    if(!orderId){
      return res.status(400).json({status:false,message:"Order ID is required."})
    }

    const order = await Order.findById(orderId);
    if(!order){
      return res.status(404).json({status:false,message:"Order not found."})
    }

    if(order.paymentStatus !== "Completed"){
      return res.status(400).json({status:false,message:"Order is not completed."})
    }
    return res.status(200).json({status:true,message:"Order is completed.",data:order});
  } catch(error){
    return res.status(500).json({status:false,message:"Server error.",error:error.message})
  }
}

export const getUserCompletedOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const completedOrders = await Order.find({ 
      userId, 
      paymentStatus: "Completed" 
    })
      .populate("eventId", "eventName")
      .sort({ createdAt: -1 
      })
     .populate({
        path: "userId",
        select: "username"
      })
      .populate({
        path: "companyId",
        select: "name"
      });
    return res.status(200).json({
      status: true,
      message: "Completed orders for user fetched successfully.",
      data: completedOrders,
    });
  } catch (error) {
    console.error("User Completed Orders Error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate("eventId")
      .populate("userId", "firstName lastName email");

    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found." });
    }

    return res.status(200).json({ 
      status: true, 
      message: "Order fetched successfully!", 
      data: { ...order._doc, paymentStatus: order.paymentStatus } 
    });
  } catch (error) {
    console.error("Get Order Error.", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};
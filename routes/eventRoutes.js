import express from 'express';
import {
  createEvent,
  addEventDetails,
  addTickets,
  addFaqs,
  getAllEvents,
  getEventById,
  updateEventBasic,
  updateEventDetails,
  updateEventTickets,
  updateEventFaqs,
  deleteEvent,
  updateSingleEventTicket,
  updateSingleEventFaq,
  deleteEventFaq,
  deleteEventTicket,
  getCompanyEvents,
  buyTicket
} from '../controllers/eventcontroller.js';

import upload from '../middlewares/upload.js';

const router = express.Router();

router.post('/create', upload.single('image'), createEvent);
router.put('/add-details', addEventDetails);
router.put('/add-tickets', addTickets);
router.put('/add-faqs', addFaqs);
router.get('/AllEvent', getCompanyEvents);
router.get('/', getAllEvents);
router.put('/update/basic/:eventId', upload.single('image'), updateEventBasic);
router.put('/update/details/:eventId', updateEventDetails);
router.put('/update/tickets/:eventId', updateEventTickets);
router.put('/:eventId/tickets/:ticketId', updateSingleEventTicket);
router.delete('/:eventId/tickets/:ticketId', deleteEventTicket);
router.put('/update/faqs/:eventId', updateEventFaqs);
router.put('/:eventId/faqs/:faqId', updateSingleEventFaq);
router.delete('/:eventId/faqs/:faqId', deleteEventFaq);
router.delete('/delete/:eventId', deleteEvent);
router.get('/:id', getEventById);

router.post('/buy/:eventId', buyTicket);

export default router;

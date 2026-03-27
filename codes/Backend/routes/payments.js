const express = require('express');
const Stripe = require('stripe');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(stripeSecret);
const MIN_INR = 50; // Stripe requires at least ~$0.50

// Create checkout session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course || !course.isPublished) return res.status(404).json({ message: 'Course not available' });

    // Ensure not already enrolled
    const existing = await Enrollment.findOne({ user: req.user._id, course: course._id, status: 'active' });
    if (existing) return res.status(400).json({ message: 'Already enrolled' });

    // Development fallback or Free course: no Stripe necessary
    if (!stripeSecret || course.isFree) {
      await Enrollment.findOneAndUpdate(
        { user: req.user._id, course: course._id },
        { status: 'active' },
        { upsert: true, new: true }
      );
      const clientUrl = process.env.CLIENT_URL || req.headers.origin || 'https://smart-course-trackss.vercel.app';
      return res.json({ id: course.isFree ? 'free_enrollment' : 'dev_enrollment', url: `${clientUrl}/course/${course._id}?enrolled=1` });
    }

    // Enforce minimum charge amount for Stripe
    const inr = Number.isFinite(course.priceInINR) ? course.priceInINR : 0;
    const normalizedInr = Math.max(inr, MIN_INR);
    const priceInPaise = Math.round(normalizedInr * 100);

    const clientUrl = process.env.CLIENT_URL || req.headers.origin || 'https://smart-course-trackss.vercel.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: course.title,
              description: course.description?.slice(0, 200) || 'Course',
            },
            unit_amount: priceInPaise,
          },
          quantity: 1,
        },
      ],
      success_url: `${clientUrl}/course/${course._id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/course/${course._id}?payment=cancelled`,
      metadata: {
        userId: String(req.user._id),
        courseId: String(course._id),
        original_inr: String(inr),
        normalized_inr: String(normalizedInr),
      },
    });

    // Create pending enrollment
    await Enrollment.updateOne(
      { user: req.user._id, course: course._id },
      { $setOnInsert: { status: 'pending' }, $set: { stripeSessionId: session.id } },
      { upsert: true }
    );

    res.json({ id: session.id, url: session.url });
  } catch (e) {
    console.error('create-checkout-session error:', e);
    res.status(500).json({ message: 'Failed to create checkout session', error: e.message });
  }
});

// Confirm checkout session (use when webhook isn't available in dev)
router.get('/confirm', authenticateToken, async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ message: 'session_id is required' });
    if (!stripeSecret) return res.status(400).json({ message: 'Stripe not configured' });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.payment_status !== 'paid') return res.status(400).json({ message: 'Payment not completed' });

    const userId = session.metadata?.userId;
    const courseId = session.metadata?.courseId;

    if (!userId || !courseId) return res.status(400).json({ message: 'Missing metadata' });
    if (String(req.user._id) !== String(userId)) return res.status(403).json({ message: 'Not authorized for this session' });

    await Enrollment.findOneAndUpdate(
      { user: userId, course: courseId },
      { status: 'active', stripePaymentIntentId: session.payment_intent },
      { upsert: true, new: true }
    );

    res.json({ ok: true, courseId });
  } catch (e) {
    console.error('confirm error', e);
    res.status(500).json({ message: 'Failed to confirm session' });
  }
});

// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    if (endpointSecret) {
      event = Stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = req.body; // Not recommended in production
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const courseId = session.metadata?.courseId;

      await Enrollment.findOneAndUpdate(
        { user: userId, course: courseId },
        { status: 'active', stripePaymentIntentId: session.payment_intent },
        { upsert: true }
      );
    }

    res.json({ received: true });
  } catch (e) {
    console.error('Webhook error', e);
    res.status(400).send(`Webhook Error: ${e.message}`);
  }
});

module.exports = router;



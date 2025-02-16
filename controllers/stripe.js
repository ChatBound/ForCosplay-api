const prisma = require("../config/prisma");
const stripe = require('stripe')('sk_test_51QsiBiBUKUyJ5uyojjnH4n7F8uFkftm8D0fhX7qmdstgSG6jFCpoOQ6DNPHYj7Y2DgP5ktzOQeBnmZceHUPUKtW700RbO3GTwP');


exports.payment = async (req, res) => {
  try {
    //code
    // Check user
    // req.user.id

    const cart = await prisma.cart.findFirst({
      where: {
        orderById : req.user.id,
      },
    });

    const amountTHB = cart.totalPrice * 100;


    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountTHB,
      currency: "thb",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};
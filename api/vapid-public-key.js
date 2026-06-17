module.exports = (req, res) => {
  res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
};

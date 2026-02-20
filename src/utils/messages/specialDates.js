function getSpecialDateMessage(now = new Date()) {
  const month = now.getMonth();
  const day = now.getDate();

  if (month === 0 && day === 1) {
    return "Happy New Year! Let's start with some number guessing!";
  }

  if (month === 7 && day === 15) {
    return 'Happy Independence Day! Celebrate with some fun guessing!';
  }

  if (month === 11 && day === 31) {
    return "Happy New Year's Eve! End the year with a perfect guess!";
  }

  if (month === 11 && day >= 20) {
    return 'Holiday spirit is in the air!';
  }

  if (month === 9 && day === 31) {
    return 'Spooky number guessing!';
  }

  return null;
}

module.exports = {
  getSpecialDateMessage,
};

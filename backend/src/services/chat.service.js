export const buildDMRoomId = (userA, userB) => {
  const [first, second] = [String(userA), String(userB)].sort();
  return `dm:${first}_${second}`;
};

export const getSortedParticipants = (userA, userB) => (
  [String(userA), String(userB)].sort()
);

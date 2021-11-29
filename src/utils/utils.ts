export function hex2Binary(hex: string) {
  const binary = [];
  for (let i = 0; i < hex.length; i += 2) {
    const hexByte = hex.substr(i, 2);
    binary.push(parseInt(hexByte, 16).toString(2));
  }
  return binary.join("");
}

export const getCurrentTimeStamp = () => {
  return Math.round(new Date().getTime() / 1000);
};

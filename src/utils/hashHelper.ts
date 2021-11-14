import * as CryptoJS from "crypto-js";
import Block from "../Block";

export const calculateHash = (
  index: number,
  previousHash: string,
  timeStamp: number,
  data: string
): string => {
  return CryptoJS.SHA256(index + previousHash + timeStamp + data).toString();
};

export const calculateHashForBlock = (block: Block): string => {
  return "";
};

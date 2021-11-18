import * as CryptoJS from "crypto-js";
import Block from "../Block";

export const calculateHash = (
  index: number,
  previousHash: string,
  timeStamp: number,
  data: string,
  difficulty: number,
  nonce: number
): string => {
  return CryptoJS.SHA256(index + previousHash + timeStamp + data + difficulty + nonce).toString();
};

export const calculateHashForBlock = (block: Block): string => {
  return calculateHash(
    block.index,
    block.previousHash,
    block.timeStamp,
    block.data,
    block.difficulty,
    block.nonce
  );
};

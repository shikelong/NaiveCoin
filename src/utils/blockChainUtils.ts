import Block from "../Block";
import { BLOCK_GENERATION_INTERVAL, DIFFICULTY_ADJUSTMENT_INTERVAL } from "./consts";
import { calculateHashForBlock } from "./hashHelper";

/**
 * dynamic calc difficulty due to mining speed.
 * @param latestBlock
 * @param blockChain
 * @private
 */
export function getAdjustedDifficulty(
  latestBlock: Block,
  blockChain: Block[]
): number {
  const prevAdjustmentBlock: Block =
    blockChain[blockChain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  const timeExpected =
    BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
  const timeTaken = latestBlock.timeStamp - prevAdjustmentBlock.timeStamp;
  if (timeTaken < timeExpected / 2) {
    return prevAdjustmentBlock.difficulty + 1;
  } else if (timeTaken > timeExpected * 2) {
    return prevAdjustmentBlock.difficulty - 1;
  } else {
    return prevAdjustmentBlock.difficulty;
  }
}

/**
 * judge is newBlock is valid.
 * 1. new Block's index must == previousBlock.index + 1
 * 2. previousHash must correct
 * 3. the hash of the newBlock itself must be valid.
 * @param newBlock
 * @param previousBlock
 */
export function isValidNewBlock(
  newBlock: Block,
  previousBlock: Block
): boolean {
  if (previousBlock.index + 1 !== newBlock.index) {
    console.error("new Block's index is invalid");
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    console.error("new Block's previousHash is invalid");
    return false;
  }
    //jump this step for test.
    // else if (
    //   previousBlock.timeStamp - 60 < newBlock.timeStamp &&
    //   newBlock.timeStamp - 60 < getCurrentTimeStamp()
    // ) {
    //   console.error("invalid timestamp");
    //   return false;
  // }
  else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
    console.error(
      `new Block\'s hash is invalid, calculate is ${calculateHashForBlock(
        newBlock
      )}, block.hash is ${newBlock.hash}`
    );
    return false;
  }
  return true;
}

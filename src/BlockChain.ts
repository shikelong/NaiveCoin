import Block from "./Block";
import { calculateHash, calculateHashForBlock } from "./utils/hashHelper";
import { broadcastLatest } from "./utils/p2p";
import {
  BLOCK_GENERATION_INTERVAL,
  DIFFICULTY_ADJUSTMENT_INTERVAL,
} from "./utils/consts";

//创世区块
//没有 previousHash
export const genesisBlock: Block = new Block(
  0,
  "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7",
  null,
  1465154705,
  "I'm genesis block!",
  0,
  0
);

export default class BlockChain {
  private blocks: Block[];

  constructor() {
    this.blocks = [genesisBlock];
  }

  getBlockChain = function () {
    return this.blocks;
  };

  addBlockToChain = function (newBlock: Block) {
    if (BlockChain.isValidNewBlock(newBlock, this.getLatestBlock())) {
      this.blocks.push(newBlock);
      return true;
    }
    return false;
  };

  replaceChain = function (newBlocks: Block[]) {
    if (
      BlockChain.isValidChain(newBlocks) &&
      BlockChain.getAccumulatedDifficulty(newBlocks) >
        BlockChain.getAccumulatedDifficulty(this.getBlockChain())
    ) {
      console.log(
        "Received blockchain is valid. Replacing current blockchain with received blockchain"
      );
      this.blocks = newBlocks;
      broadcastLatest();
    } else {
      console.log("received blockchain invalid");
    }
  };

  getLatestBlock = function (): Block {
    return this.blocks[this.blocks.length - 1];
  };

  generateNextBlock = function (blockData: string): Block {
    const previousBlock: Block = this.getLatestBlock();
    const nextIndex: number = previousBlock.index + 1;
    const nextTimestamp: number = new Date().getTime() / 1000;
    const difficulty: number = BlockChain.getDifficulty(this.getBlockChain());

    const newBlock: Block = this.findBlock(
      nextIndex,
      previousBlock.hash,
      nextTimestamp,
      blockData,
      difficulty
    );
    this.addBlock(newBlock);
    broadcastLatest();
    return newBlock;
  };

  addBlock = function (newBlock: Block) {
    if (BlockChain.isValidNewBlock(newBlock, this.getLatestBlock())) {
      this.blocks.push(newBlock);
    }
  };

  findBlock = function (
    index: number,
    previousHash: string,
    timestamp: number,
    data: string,
    difficulty: number
  ): Block {
    let nonce = 0;
    while (true) {
      const hash: string = calculateHash(
        index,
        previousHash,
        timestamp,
        data,
        difficulty,
        nonce
      );
      if (Block.hashMatchesDifficulty(hash, difficulty)) {
        return new Block(
          index,
          hash,
          previousHash,
          timestamp,
          data,
          difficulty,
          nonce
        );
      }
      nonce++;
    }
  };

  /**
   * judge is newBlock is valid.
   * 1. new Block's index must == previousBlock.index + 1
   * 2. previousHash must correct
   * 3. the hash of the newBlock itself must be valid.
   * @param newBlock
   */
  static isValidNewBlock = function (
    newBlock: Block,
    previousBlock: Block
  ): boolean {
    if (previousBlock.index + 1 !== newBlock.index) {
      console.error("new Block's index is invalid");
      return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
      console.error("new Block's previousHash is invalid");
      return false;
    } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
      console.error(
        `new Block\'s hash is invalid, calculate is ${calculateHashForBlock(
          newBlock
        )}, block.hash is ${newBlock.hash}`
      );
      return false;
    }
    return true;
  };

  static isValidChain = function (blockChain: Block[]): boolean {
    const isValidGenesis = (block: Block) => {
      return JSON.stringify(block) === JSON.stringify(genesisBlock);
    };

    if (!isValidGenesis(blockChain[0])) {
      return false;
    }

    for (let i = 1; i < blockChain.length; i++) {
      if (!BlockChain.isValidNewBlock(blockChain[i], blockChain[i - 1])) {
        return false;
      }
    }

    return true;
  };

  static getDifficulty = function (blockChain: Block[]): number {
    const latestBlock: Block = blockChain[blockChain.length - 1];
    if (
      latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
      latestBlock.index !== 0
    ) {
      return BlockChain.getAdjustedDifficulty(latestBlock, blockChain);
    } else {
      return latestBlock.difficulty;
    }
  };

  static getAdjustedDifficulty = function (
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
  };

  static getAccumulatedDifficulty = function (blockChain: Block[]): number {
    let accumulatedDifficulty = 0;
    for (let i = blockChain.length - 1; i >= 0; i--) {
      accumulatedDifficulty += Math.pow(2, blockChain[i].difficulty);
    }
    return accumulatedDifficulty;
  };
}

export const blockChainInstance = new BlockChain();

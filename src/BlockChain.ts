import Block from "./Block";
import { calculateHash, calculateHashForBlock } from "./utils/hashHelper";
import { broadcastLatest, broadCastTransactionPool } from "./utils/p2p";
import {
  BLOCK_GENERATION_INTERVAL,
  DIFFICULTY_ADJUSTMENT_INTERVAL,
  GENESIS_BLOCK,
} from "./utils/consts";
import {
  getCoinbaseTransaction,
  isValidAddress,
  processTransactions,
  Transaction,
  UnspentTxOut,
} from "./transaction";
import {
  createTransaction,
  getPrivateFromWallet,
  getPublicFromWallet,
} from "./wallet";
import {
  addToTransactionPool,
  getTransactionPool,
  updateTransactionPool,
} from "./transactionPool";
import { getCurrentTimeStamp } from "./utils/utils";
import _ from "lodash";

export default class BlockChain {
  private _blocks: Block[];
  private _unspentTxOuts: UnspentTxOut[] = [];

  constructor() {
    this._blocks = [GENESIS_BLOCK];
  }

  get blocks() {
    return this._blocks;
  }

  set blocks(v) {
    this._blocks = v;
  }

  get unspentTxOuts() {
    return this._unspentTxOuts;
  }
  set unspentTxOuts(v) {
    this._unspentTxOuts = v;
  }

  public appendBlock(newBlock: Block) {
    if (BlockChain.isValidNewBlock(newBlock, this.getLatestBlock())) {
      const retVal = processTransactions(
        newBlock.data,
        this._unspentTxOuts,
        newBlock.index
      );

      if (retVal === null) {
        return false;
      } else {
        this.blocks.push(newBlock);
        this.unspentTxOuts = retVal;
        updateTransactionPool(this._unspentTxOuts);
        return true;
      }
    }
    return false;
  }

  public replaceChain(newBlocks: Block[]) {
    const aUnspentTxOuts = BlockChain.isValidChain(newBlocks);
    const validChain: boolean = aUnspentTxOuts !== null;
    if (
      BlockChain.isValidChain(newBlocks) &&
      this.getAccumulatedDifficulty(newBlocks) > this.getAccumulatedDifficulty()
    ) {
      console.log(
        "Received blockchain is valid. Replacing current blockchain with received blockchain"
      );
      this.blocks = newBlocks;
      this.unspentTxOuts = aUnspentTxOuts;
      updateTransactionPool(this._unspentTxOuts);
      broadcastLatest();
    } else {
      console.log("received blockchain invalid");
    }
  }

  public getLatestBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  public sendTransaction(address: string, amount: number): Transaction {
    const tx: Transaction = createTransaction(
      address,
      amount,
      getPrivateFromWallet(),
      this.unspentTxOuts,
      getTransactionPool()
    );
    addToTransactionPool(tx, this.unspentTxOuts);
    broadCastTransactionPool();
    return tx;
  }

  public generateNextBlock(blockData: Transaction[]): Block {
    const previousBlock: Block = this.getLatestBlock();
    const nextIndex: number = previousBlock.index + 1;
    const nextTimestamp: number = new Date().getTime() / 1000;
    const difficulty: number = this.getDifficulty();

    const newBlock: Block = this.findBlock(
      nextIndex,
      previousBlock.hash,
      nextTimestamp,
      blockData,
      difficulty
    );
    if (this.appendBlock(newBlock)) {
      broadcastLatest();
      return newBlock;
    }
    return null;
  }

  /**
   * calc hash function many times to Find a block match difficulty
   * @param index
   * @param previousHash
   * @param timestamp
   * @param data
   * @param difficulty
   * @private
   */
  private findBlock(data: Transaction[]): Block {
    const latestBlock: Block = this.getLatestBlock();
    const difficulty: number = this.getDifficulty();
    const nextIndex: number = latestBlock.index + 1;
    const timeStamp: number = getCurrentTimeStamp();

    const fixedParams = {
      index: nextIndex,
      previousHash: latestBlock.hash,
      timeStamp: timeStamp,
      data: data,
      difficulty: difficulty,
    };

    let nonce = 0;
    while (true) {
      const hash: string = calculateHash(
        {
          ...fixedParams,
          nonce
        }
      );
      if (Block.hashMatchesDifficulty(hash, difficulty)) {
        return new Block(
          nextIndex,
          hash,
          latestBlock.hash,
          timeStamp,
          data,
          difficulty,
          nonce
        );
      }
      nonce++;
    }
  }

  public handleReceivedTransaction(transaction: Transaction) {
    addToTransactionPool(transaction, this.unspentTxOuts);
  }

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
  };

  static isValidChain = function (blockChain: Block[]): UnspentTxOut[] {
    const isValidGenesis = (block: Block) => {
      return JSON.stringify(block) === JSON.stringify(GENESIS_BLOCK);
    };

    if (!isValidGenesis(blockChain[0])) {
      return null;
    }

    let aUnspentTxOuts: UnspentTxOut[] = [];

    for (let i = 1; i < blockChain.length; i++) {
      if (!BlockChain.isValidNewBlock(blockChain[i], blockChain[i - 1])) {
        return null;
      }

      aUnspentTxOuts = processTransactions(
        blockChain[i].data,
        aUnspentTxOuts,
        blockChain[i].index
      );

      if (aUnspentTxOuts === null) {
        console.log("invalid transactions in blockchain");
        return null;
      }
    }

    return aUnspentTxOuts;
  };

  private getDifficulty(): number {
    const latestBlock: Block = this.getLatestBlock();
    if (
      latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
      latestBlock.index !== 0
    ) {
      return BlockChain.getAdjustedDifficulty(latestBlock, this.blocks);
    } else {
      return latestBlock.difficulty;
    }
  }

  private static getAdjustedDifficulty(
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

  private getAccumulatedDifficulty(blockChain = this.blocks): number {
    let accumulatedDifficulty = 0;
    for (let i = blockChain.length - 1; i >= 0; i--) {
      accumulatedDifficulty += Math.pow(2, blockChain[i].difficulty);
    }
    return accumulatedDifficulty;
  }

  public generateNextBlockWithTransaction(
    receiverAddress: string,
    amount: number
  ) {
    if (!isValidAddress(receiverAddress)) {
      throw new Error("invalid address");
    }
    if (amount < 0 || typeof amount !== "number") {
      throw new Error("invalid amount");
    }

    const coinbaseTx = getCoinbaseTransaction(
      getPublicFromWallet(),
      this.getLatestBlock().index + 1
    );
    const tx: Transaction = createTransaction(
      receiverAddress,
      amount,
      getPrivateFromWallet(),
      this.unspentTxOuts,
      getTransactionPool()
    );

    const blockData: Transaction[] = [coinbaseTx, tx];

    return this.generateRawNextBlock(blockData);
  }

  public generateRawNextBlock(blockData: Transaction[]) {
    const previousBlock: Block = this.getLatestBlock();
    const difficulty: number = this.getDifficulty();
    const nextIndex: number = previousBlock.index + 1;
    const nextTimestamp: number = getCurrentTimeStamp();
    const newBlock: Block = this.findBlock(
      nextIndex,
      previousBlock.hash,
      nextTimestamp,
      blockData,
      difficulty
    );
    if (this.appendBlock(newBlock)) {
      broadcastLatest();
      return newBlock;
    } else {
      return null;
    }
  }
}

export const blockChainInstance = new BlockChain();

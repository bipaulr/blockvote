import React from 'react';
import { motion } from 'framer-motion';
import BlockExplorer from '../components/blockchain/BlockExplorer';
import TamperSimulator from '../components/blockchain/TamperSimulator';

export default function BlockchainPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h2>Chain Explorer</h2>
        <p className="page-sub">Live view of the local Ethereum node</p>
      </div>
      <BlockExplorer />
      <TamperSimulator />
    </motion.div>
  );
}

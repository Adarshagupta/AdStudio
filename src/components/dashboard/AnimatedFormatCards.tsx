"use client";

import { motion } from "framer-motion";

import { FormatCard } from "@/components/dashboard/FormatCard";
import type { FormatConfig } from "@/lib/formats";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 15,
      mass: 0.8,
    },
  },
};

export function AnimatedFormatCards({ formatCards }: { formatCards: FormatConfig[] }) {
  return (
    <motion.section
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {formatCards.map((format) => (
          <motion.div key={format.slug} variants={itemVariants}>
            <FormatCard format={format} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

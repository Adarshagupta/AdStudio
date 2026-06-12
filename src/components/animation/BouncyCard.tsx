"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface BouncyCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hoverScale?: number;
  hoverY?: number;
}

export function BouncyCard({
  children,
  className = "",
  delay = 0,
  hoverScale = 1.02,
  hoverY = -4,
}: BouncyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 15,
        mass: 0.8,
        delay,
      }}
      whileHover={{
        scale: hoverScale,
        y: hoverY,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 10,
        },
      }}
      whileTap={{
        scale: 0.97,
        transition: {
          type: "spring",
          stiffness: 500,
          damping: 10,
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

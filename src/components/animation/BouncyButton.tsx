"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface BouncyButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function BouncyButton({
  children,
  className = "",
  onClick,
  disabled = false,
  type = "button",
}: BouncyButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={
        disabled
          ? {}
          : {
              scale: 1.05,
              y: -2,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 10,
              },
            }
      }
      whileTap={
        disabled
          ? {}
          : {
              scale: 0.95,
              transition: {
                type: "spring",
                stiffness: 500,
                damping: 10,
              },
            }
      }
      className={className}
    >
      {children}
    </motion.button>
  );
}

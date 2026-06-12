"use client";

import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ImageWithEditProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  size?: "sm" | "md" | "lg";
}

export function ImageWithEdit({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  size = "md",
}: ImageWithEditProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const editHref = `/studio/image/edit?image=${encodeURIComponent(src)}`;

  const handleClick = () => {
    sessionStorage.setItem("studio-image-url", src);
  };

  return (
    <div className={cn("group relative inline-block", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={cn("block", imgClassName)} />

      {/* Edit overlay */}
      <div className="absolute inset-0 flex items-start justify-end p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Link href={editHref} onClick={handleClick}>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "flex items-center justify-center rounded-full bg-zinc-900/80 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-zinc-900",
              sizeClasses[size]
            )}
            title="Edit in Image Studio"
          >
            <Pencil className={iconSizes[size]} />
          </motion.div>
        </Link>
      </div>
    </div>
  );
}

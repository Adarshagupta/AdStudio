"use client";

import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { setStudioImageUrl } from "@/lib/studio-image-transfer";

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
  const router = useRouter();

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

  function openInStudio(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setStudioImageUrl(src);
    router.push("/studio/image/edit");
  }

  return (
    <div className={cn("group relative inline-block", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={cn("block", imgClassName)} />

      <div className="absolute inset-0 flex items-start justify-end p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={openInStudio}
          className={cn(
            "flex items-center justify-center rounded-full bg-zinc-900/80 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-zinc-900",
            sizeClasses[size]
          )}
          title="Edit in Image Studio"
        >
          <Pencil className={iconSizes[size]} />
        </motion.button>
      </div>
    </div>
  );
}

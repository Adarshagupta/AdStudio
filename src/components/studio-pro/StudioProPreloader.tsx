import { LiteMoovPreloader } from "@/components/brand/LiteMoovPreloader";

type StudioProPreloaderProps = {
  fullscreen?: boolean;
  variant?: "inline" | "shell" | "fullscreen";
  className?: string;
};

export function StudioProPreloader(props: StudioProPreloaderProps) {
  return <LiteMoovPreloader subtitle="Studio" {...props} />;
}

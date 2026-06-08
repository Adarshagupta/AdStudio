import { toast } from "sonner";

type NotifyOptions = {
  description?: string;
};

export const notify = {
  success(message: string, options?: NotifyOptions) {
    toast.success(message, options);
  },
  error(message: string, options?: NotifyOptions) {
    toast.error(message, options);
  },
  info(message: string, options?: NotifyOptions) {
    toast.message(message, options);
  },
};

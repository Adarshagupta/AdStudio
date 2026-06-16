export type StudioTool =
  | "select"
  | "brush"
  | "eraser"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "text"
  | "crop"
  | "eyedropper"
  | "shape";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  canvas: HTMLCanvasElement;
  thumbnail?: string;
}

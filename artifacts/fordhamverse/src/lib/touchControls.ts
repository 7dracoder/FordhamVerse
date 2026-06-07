/**
 * Shared on-screen (touch) movement state for mobile players.
 *
 * The 3D controller reads keyboard input via drei's `useKeyboardControls`, which
 * has no concept of touch. The on-screen D-pad buttons (see `MobileControls`)
 * mutate this singleton on press/release, and `ControllablePlayer` ORs these
 * flags together with the keyboard state each frame — so touch and keyboard
 * drive movement through the same code path.
 */
export type TouchControlKey =
  | "forward"
  | "back"
  | "left"
  | "right"
  | "jump"
  | "sprint";

export const touchControls: Record<TouchControlKey, boolean> = {
  forward: false,
  back: false,
  left: false,
  right: false,
  jump: false,
  sprint: false,
};

export function setTouchControl(key: TouchControlKey, value: boolean): void {
  touchControls[key] = value;
}

export function resetTouchControls(): void {
  touchControls.forward = false;
  touchControls.back = false;
  touchControls.left = false;
  touchControls.right = false;
  touchControls.jump = false;
  touchControls.sprint = false;
}

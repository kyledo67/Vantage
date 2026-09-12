/**
 * Shared motion tokens. Every animation in the dashboard pulls its timing from
 * here so the whole surface stays inside the agreed budgets:
 *   navigation < 220ms · interaction 150-180ms · expand 180-240ms · chart 300-450ms
 */

export const DURATION = {
  interaction: 0.16, // 160ms — presses, tab/filter selection
  nav: 0.2, //          200ms — sidebar pill, drawer
  expand: 0.22, //      220ms — row expansion
  chart: 0.42, //       420ms — chart path draw on new data
}

export const EASE = {
  // Crisp deceleration — reaches its resting state early, feels fast.
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
}

export const SPRING_PILL = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }

/** Press feedback used across rows and buttons — never below 0.99 on rows. */
export const PRESS_ROW = { scale: 0.995 }
export const PRESS_BUTTON = { scale: 0.97 }

import styles from "./marked.module.css";

export function MarkedAura() {
  return (
    <span className={styles.root}>
      <svg viewBox="0 0 24 24" className={styles.leaf} aria-hidden>
        <path d="M20 3C9 3 4 9 4 15c0 1.5.4 2.8 1 4l-2 2 1.4 1.4 2-2c1.2.6 2.5 1 4 1 6 0 12-5 12-16z" fill="#34d399" stroke="#a7f3d0" strokeWidth="1" />
      </svg>
    </span>
  );
}

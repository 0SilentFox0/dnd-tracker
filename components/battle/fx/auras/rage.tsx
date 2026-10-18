import styles from "./rage.module.css";

export function RageAura() {
  return (
    <span className={styles.root}>
      <span className={styles.glow} />
      {[0, 1, 2].map((i) => <span key={i} className={styles.wisp} style={{ left: `${22 + i * 26}%`, animationDelay: `${i * 0.45}s` }} />)}
    </span>
  );
}

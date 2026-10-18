import styles from "./burning.module.css";

export function BurningAura() {
  return (
    <span className={styles.root}>
      <span className={styles.glow} />
      {[0, 1, 2, 3, 4].map((i) => <span key={i} className={styles.ember} style={{ left: `${12 + i * 18}%`, animationDelay: `${i * 0.35}s`, animationDuration: `${1.4 + (i % 3) * 0.3}s` }} />)}
    </span>
  );
}

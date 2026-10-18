import styles from "./plague.module.css";

export function PlagueAura() {
  return (
    <span className={styles.root}>
      <span className={styles.glow} />
      {[0, 1, 2, 3].map((i) => <span key={i} className={styles.spore} style={{ left: `${20 + i * 20}%`, animationDelay: `${i * 0.6}s` }} />)}
    </span>
  );
}

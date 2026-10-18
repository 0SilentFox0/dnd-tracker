import styles from "./regen.module.css";

export function RegenAura() {
  return (
    <span className={styles.root}>
      <span className={styles.rim} />
      <span className={styles.clip}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={styles.mote} style={{ left: `${20 + i * 18}%`, animationDelay: `${i * 0.5}s` }} />)}
      </span>
    </span>
  );
}

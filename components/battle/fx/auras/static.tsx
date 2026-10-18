import styles from "./static.module.css";

export function StaticAura() {
  return (
    <span className={styles.root}>
      <span className={styles.outline} />
      {[0, 1].map((i) => <span key={i} className={styles.arc} style={{ left: i ? '62%' : '8%', top: i ? '12%' : '58%', animationDelay: `${i * 0.55}s` }} />)}
    </span>
  );
}

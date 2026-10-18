import styles from "./charm.module.css";

export function CharmAura() {
  return (
    <span className={styles.root}>
      {[0, 1].map((i) => <span key={i} className={styles.heart} style={{ left: i ? '88%' : '-6%', animationDelay: `${i * 0.9}s` }}>♥</span>)}
    </span>
  );
}

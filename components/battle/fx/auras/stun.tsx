import styles from "./stun.module.css";

export function StunAura() {
  return (
    <span className={styles.root}>
      <span className={styles.orbit}>
        {[0, 1, 2].map((i) => <span key={i} className={styles.star} style={{ transform: `rotate(${i * 120}deg) translateX(var(--r))` }} />)}
      </span>
    </span>
  );
}

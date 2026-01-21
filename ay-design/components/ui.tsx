import styles from './Components.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline';
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
    return (
        <button className={`${styles.button} ${styles[variant]} ${className || ''}`} {...props} />
    );
}

export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`${styles.card} ${className || ''}`} {...props}>
            {children}
        </div>
    );
}

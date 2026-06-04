export default function SnakeWatermark({ fixed = false }: { fixed?: boolean }) {
    return (
        <img
            src="/snake.png"
            style={{
                position: fixed ? 'fixed' : 'absolute',
                right: '-80px',
                bottom: '-80px',
                width: fixed ? '750px' : '600px',
                opacity: 0.08,
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    )
}

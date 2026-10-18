const COLORS = { me: 'bg-me', her: 'bg-her' };
const SIZES = { sm: 'h-8 w-8 text-subhead', lg: 'h-20 w-20 text-title' };

export default function Avatar({ who, name, size = 'sm', className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${COLORS[who]} ${SIZES[size]} ${className}`}
    >
      {name?.[0]?.toUpperCase()}
    </span>
  );
}

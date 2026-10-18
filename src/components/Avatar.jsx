const COLORS = { me: 'bg-me', her: 'bg-her' };
const SIZES = { sm: 'h-8 w-8 text-subhead', md: 'h-12 w-12 text-body', lg: 'h-24 w-24 text-large-title' };

/** Profile photo, or the initial on the person's color. */
export default function Avatar({ who, name, src, size = 'sm', className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${COLORS[who]} ${SIZES[size]} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        name?.[0]?.toUpperCase()
      )}
    </span>
  );
}

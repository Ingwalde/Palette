import { CVD_TYPES } from "../lib/colorVision";

/**
 * The SVG `feColorMatrix` filters the colour-vision simulation references by `filter: url(#id)`.
 * Mounted once in the layout so any page can apply them. Hidden and removed from the a11y tree —
 * it renders nothing, it only defines filters.
 */
export function ColorVisionFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <defs>
        {CVD_TYPES.map((type) => (
          <filter key={type.id} id={type.id} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={type.matrix} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}

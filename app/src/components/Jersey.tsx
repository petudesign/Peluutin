interface JerseyProps {
  number: number | string;
  variant?: "outfield" | "keeper";
}

// Colours come from the --jersey-* custom properties, so a card state only has to change those variables.
export function Jersey({ number, variant = "outfield" }: JerseyProps) {
  return (
    <span className={`jersey${variant === "keeper" ? " jersey-keeper" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 64 56" focusable="false">
        <path
          className="jersey-body"
          d="M22 3 27 1.5C29 5.5 35 5.5 37 1.5L42 3 58 11Q61 12.5 60 15.5L56.2 23.8Q55.2 26 53 25L49 23V52Q49 54 47 54H17Q15 54 15 52V23L11 25Q8.8 26 7.8 23.8L4 15.5Q3 12.5 6 11Z"
        />
        <path className="jersey-shade" d="M15 23 11 25Q8.8 26 7.8 23.8L4 15.5Q3 12.5 6 11L22 3 24.5 2.3 21 23V54H17Q15 54 15 52Z" />
        <path className="jersey-collar" d="M27 1.8C29 6.6 35 6.6 37 1.8" />
      </svg>
      <span className="jersey-number">{number}</span>
    </span>
  );
}

// ---- The nav's clock ----------------------------------------------------------------
// Valencia's time in #nav-clock-time, kept up to date. `onChange` is called
// whenever the text actually changes (once a minute).
export function startNavClock(onChange) {
  const time = document.querySelector("#nav-clock-time");
  const formatter = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const update = () => {
    const text = formatter.format(new Date());
    if (text === time.textContent) return;
    time.textContent = text;
    if (onChange) onChange();
  };
  update();
  setInterval(update, 1000);
}

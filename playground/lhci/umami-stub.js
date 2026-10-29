// Stub Umami skripte SAMO za Lighthouse (pnpm lighthouse:umami): isti API (`umami.track`), brez omrežja.
// Prava skripta z lažnim websiteId dobi od Umami API 400, kar Lighthouse šteje kot napako v konzoli.
// Ne gre v produkcijo: kopira se v playground/dist samo pred meritvijo.
window.umami = { track() {} };

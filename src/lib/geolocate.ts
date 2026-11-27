export type LatLng = [number, number];

/** Asks the browser for the traveller's position once; the callback gets it or a readable reason it failed. */
export function locate(onOk: (p: LatLng, accuracyM: number) => void, onFail: (why: string) => void) {
  if (!navigator.geolocation) return onFail("This browser can't share your location.");
  navigator.geolocation.getCurrentPosition(
    (pos) => onOk([pos.coords.latitude, pos.coords.longitude], pos.coords.accuracy),
    (err) => onFail(err.code === err.PERMISSION_DENIED ? 'Location is blocked. Allow it for this site in the browser, then try again.' : "Couldn't get your location. Try again."),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
  );
}


/// <reference types="vite/client" />

type GoogleMapsWindow = typeof google

interface Window {
  google?: GoogleMapsWindow
}
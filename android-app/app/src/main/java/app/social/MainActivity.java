package app.social;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.graphics.drawable.GradientDrawable;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.webkit.JavascriptInterface;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    /** Die komplette App liegt im APK (assets/www) und wird über diese Fantasie-Adresse ausgeliefert. */
    private static final String LOCAL_HOST = "social.local";
    private static final String LOCAL_URL = "https://" + LOCAL_HOST + "/";
    private WebView web;
    private SharedPreferences prefs;
    private String mode = "portrait";
    private TextView modeButton;
    private ValueCallback<Uri[]> fileCallback;
    private static final int FILE_CHOOSER = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#313338"));
        w.setNavigationBarColor(Color.parseColor("#1e1f22"));
        w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);

        prefs = getSharedPreferences("social_app", MODE_PRIVATE);
        mode = prefs.getString("mode", prefs.getBoolean("desktop", false) ? "desktop" : "portrait");
        applyOrientation();

        WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#313338"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        String ua = s.getUserAgentString();
        if (ua != null) {
            s.setUserAgentString(ua.replace("; wv", "") + " SocialApp/1.0");
        }
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!LOCAL_HOST.equals(uri.getHost())) return null;
                return serveAsset(uri.getPath());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                applyViewport();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost() == null ? "" : uri.getHost();
                String url = uri.toString();
                if (LOCAL_HOST.equals(host)) return false;
                if (host.contains("accounts.google.com")
                        || host.contains("google.com") && url.contains("oauth")
                        || host.contains("api.twitter.com")
                        || host.contains("twitter.com")
                        || host.equals("x.com")
                        || host.endsWith(".x.com")) {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    return true;
                }
                if (url.startsWith("mailto:") || url.startsWith("tel:")) {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    return true;
                }
                return false;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;
                Intent intent = params.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER);
                } catch (Exception e) {
                    fileCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(startUrl());
        }
        FrameLayout root = new FrameLayout(this);
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        web.addJavascriptInterface(new Bridge(), "SocialApp");
        modeButton = buildModeButton();
        modeButton.setVisibility(prefs.getBoolean("show_button", false) ? View.VISIBLE : View.GONE);
        int size = dp(42);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(size, size, Gravity.END | Gravity.TOP);
        lp.setMargins(0, 0, dp(6), 0);
        root.addView(modeButton, lp);
        root.post(() -> modeButton.setTranslationY(prefs.getFloat("btn_y", root.getHeight() * 0.42f)));
        setContentView(root);
    }

    private int dp(int v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    // ---------- Handy- oder Desktop-Ansicht ----------

    /** Handy = hochkant mit Handy-Layout, Desktop = quer mit Seitenleiste wie am PC. */
    private boolean isDesktop() { return "desktop".equals(mode); }

    private void applyOrientation() {
        int o;
        switch (mode) {
            case "auto": o = ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR; break;
            case "landscape":
            case "desktop": o = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE; break;
            default: o = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
        }
        setRequestedOrientation(o);
    }

    /** Wird aus den Einstellungen der Web-App aufgerufen (window.SocialApp). */
    private class Bridge {
        @JavascriptInterface public String getMode() { return mode; }
        @JavascriptInterface public void setMode(String m) { runOnUiThread(() -> changeMode(m)); }
        @JavascriptInterface public boolean getButton() { return prefs.getBoolean("show_button", false); }
        @JavascriptInterface public void setButton(boolean show) {
            runOnUiThread(() -> {
                prefs.edit().putBoolean("show_button", show).apply();
                modeButton.setVisibility(show ? View.VISIBLE : View.GONE);
            });
        }
    }

    private void changeMode(String m) {
        if (m == null || m.equals(mode)) return;
        boolean wasDesktop = isDesktop();
        mode = m;
        prefs.edit().putString("mode", mode).apply();
        modeButton.setText(isDesktop() ? "📱" : "🖥");
        applyOrientation();
        applyViewport();
        if (wasDesktop != isDesktop()) web.postDelayed(() -> web.reload(), 350);
    }

    /** Desktop: Seite wird 1280px breit gerendert und passend verkleinert → echtes Desktop-Layout. */
    private void applyViewport() {
        if (web == null) return;
        WebSettings s = web.getSettings();
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        String content = isDesktop() ? "width=1280" : "width=device-width, initial-scale=1, viewport-fit=cover";
        String js = "(function(){window.__vpWanted='" + content + "';"
                + "function f(){var m=document.querySelector('meta[name=viewport]');"
                + "if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m);}"
                + "if(m.getAttribute('content')!==window.__vpWanted)m.setAttribute('content',window.__vpWanted);}"
                + "f();if(!window.__vpObs){window.__vpObs=new MutationObserver(f);"
                + "window.__vpObs.observe(document.head,{childList:true,subtree:true,attributes:true});}})();";
        web.evaluateJavascript(js, null);
    }

    private void toggleMode() {
        changeMode(isDesktop() ? "portrait" : "desktop");
    }

    @SuppressLint("ClickableViewAccessibility")
    private TextView buildModeButton() {
        TextView b = new TextView(this);
        b.setText(isDesktop() ? "📱" : "🖥");
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        b.setGravity(Gravity.CENTER);
        b.setAlpha(0.8f);
        b.setContentDescription("Zwischen Handy- und Desktop-Ansicht wechseln");
        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(Color.parseColor("#5865F2"));
        bg.setStroke(dp(2), Color.parseColor("#33FFFFFF"));
        b.setBackground(bg);
        b.setElevation(dp(6));
        // Antippen = umschalten, gedrückt halten und ziehen = verschieben
        final float[] start = new float[2];
        final boolean[] moved = new boolean[1];
        b.setOnTouchListener((v, e) -> {
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    start[0] = e.getRawY();
                    start[1] = v.getTranslationY();
                    moved[0] = false;
                    v.setAlpha(1f);
                    return true;
                case MotionEvent.ACTION_MOVE:
                    float dy = e.getRawY() - start[0];
                    if (Math.abs(dy) > dp(6)) moved[0] = true;
                    if (moved[0]) {
                        View parent = (View) v.getParent();
                        float max = parent.getHeight() - v.getHeight();
                        v.setTranslationY(Math.max(0, Math.min(max, start[1] + dy)));
                    }
                    return true;
                case MotionEvent.ACTION_UP:
                    v.setAlpha(0.8f);
                    if (moved[0]) prefs.edit().putFloat("btn_y", v.getTranslationY()).apply();
                    else toggleMode();
                    return true;
                default:
                    return false;
            }
        });
        return b;
    }

    /** Offline (Standard): eingebaute App. Optional: assets/live_url.txt mit einer echten Web-Adresse. */
    private String startUrl() {
        try (InputStream in = getAssets().open("live_url.txt")) {
            byte[] b = new byte[2048];
            int n = in.read(b);
            String url = n > 0 ? new String(b, 0, n, "UTF-8").trim() : "";
            if (url.startsWith("http")) return url;
        } catch (Exception ignored) { }
        return LOCAL_URL;
    }

    private static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html"); MIME.put("js", "text/javascript"); MIME.put("mjs", "text/javascript");
        MIME.put("css", "text/css"); MIME.put("json", "application/json"); MIME.put("wasm", "application/wasm");
        MIME.put("svg", "image/svg+xml"); MIME.put("png", "image/png"); MIME.put("jpg", "image/jpeg");
        MIME.put("jpeg", "image/jpeg"); MIME.put("webp", "image/webp"); MIME.put("gif", "image/gif");
        MIME.put("ico", "image/x-icon"); MIME.put("woff2", "font/woff2"); MIME.put("woff", "font/woff");
        MIME.put("ttf", "font/ttf"); MIME.put("data", "application/octet-stream"); MIME.put("txt", "text/plain");
        MIME.put("webmanifest", "application/manifest+json"); MIME.put("mp3", "audio/mpeg"); MIME.put("mp4", "video/mp4");
    }

    /** Liefert Dateien aus assets/www; unbekannte Pfade (App-Seiten wie /chat) bekommen index.html. */
    private WebResourceResponse serveAsset(String path) {
        if (path == null || path.isEmpty() || path.endsWith("/")) path = "/index.html";
        String file = "www" + path;
        InputStream in;
        try {
            in = getAssets().open(file);
        } catch (Exception e) {
            file = "www/index.html";
            try { in = getAssets().open(file); } catch (Exception e2) { return null; }
        }
        String ext = file.contains(".") ? file.substring(file.lastIndexOf('.') + 1).toLowerCase() : "";
        String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
        String enc = mime.startsWith("text/") || mime.endsWith("javascript") || mime.endsWith("json") ? "UTF-8" : null;
        WebResourceResponse res = new WebResourceResponse(mime, enc, in);
        Map<String, String> headers = new HashMap<>();
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Cache-Control", "no-cache");
        res.setResponseHeaders(headers);
        return res;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER || fileCallback == null) return;
        Uri[] uris = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        fileCallback.onReceiveValue(uris);
        fileCallback = null;
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            event.startTracking();
        }
        return super.onKeyDown(keyCode, event);
    }

    // Lange auf "Zurück" drücken: zur Startseite der App.
    @Override
    public boolean onKeyLongPress(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web != null) {
            web.loadUrl(LOCAL_URL);
            return true;
        }
        return super.onKeyLongPress(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }
}

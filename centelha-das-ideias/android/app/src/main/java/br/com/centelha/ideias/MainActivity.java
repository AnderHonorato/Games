package br.com.centelha.ideias;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;

/** Host do build local: sem servidor, sem bridge JS nativa, sem página remota. */
public final class MainActivity extends Activity {
    private static final String START_URL =
            "https://appassets.androidplatform.net/assets/web/index.html";
    private WebView webView;
    private AlertDialog backDialog;
    private boolean foreground;
    private boolean pausedByAndroid;
    private boolean pauseAfterLoad;

    @SuppressLint("SetJavaScriptEnabled") // O conteúdo é o jogo empacotado e controlado pelo app.
    @SuppressWarnings("deprecation")
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams attributes = getWindow().getAttributes();
            attributes.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(attributes);
        }
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(23, 21, 34));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        webView.setWebChromeClient(new WebChromeClient());

        final WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (isLocalAsset(request.getUrl())) {
                    WebResourceResponse resource = assets.shouldInterceptRequest(request.getUrl());
                    if (resource != null) return resource;
                }
                // Não deixa asset ausente cair no DNS, nem carrega documentos/recursos remotos.
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                        java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isGameDocument(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!foreground || pauseAfterLoad) dispatch("centelha:pausar");
                if (foreground) dispatch("centelha:retomar");
                pauseAfterLoad = false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame() && !isFinishing()) {
                    new AlertDialog.Builder(MainActivity.this)
                            .setTitle(R.string.load_error_title)
                            .setMessage(R.string.load_error_message)
                            .setPositiveButton(R.string.load_error_retry, (dialog, which) -> view.reload())
                            .show();
                }
            }
        });

        // Mantém os controles fora dos recortes físicos também em paisagem invertida.
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
                android.view.DisplayCutout cutout = insets.getDisplayCutout();
                view.setPadding(cutout.getSafeInsetLeft(), cutout.getSafeInsetTop(),
                        cutout.getSafeInsetRight(), cutout.getSafeInsetBottom());
            } else view.setPadding(0, 0, 0, 0);
            return insets;
        });
        immersive();
        String url = savedInstanceState == null ? null : savedInstanceState.getString("gameUrl");
        pauseAfterLoad = savedInstanceState != null;
        webView.loadUrl(url != null && isGameDocument(Uri.parse(url)) ? url : START_URL);
    }

    private static boolean isLocalAsset(Uri uri) {
        return "https".equals(uri.getScheme())
                && "appassets.androidplatform.net".equals(uri.getHost())
                && uri.getPort() == -1 && uri.getUserInfo() == null
                && uri.getPath() != null && uri.getPath().startsWith("/assets/");
    }

    private static boolean isGameDocument(Uri uri) {
        return isLocalAsset(uri) && "/assets/web/index.html".equals(uri.getPath());
    }

    private void dispatch(String event) {
        // Literais internos; nenhum parâmetro recebido de intents/URLs entra no JavaScript.
        webView.evaluateJavascript("window.dispatchEvent(new Event('" + event + "'));", null);
    }

    @Override
    protected void onPause() {
        foreground = false;
        pausedByAndroid = true;
        dispatch("centelha:pausar");
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        foreground = true;
        webView.onResume();
        if (pausedByAndroid) dispatch("centelha:pausar");
        pausedByAndroid = false;
        // Este evento libera o áudio; o jogo permanece no estado de pausa.
        dispatch("centelha:retomar");
        immersive();
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        state.putString("gameUrl", webView.getUrl());
        super.onSaveInstanceState(state);
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        dispatch("centelha:pausar");
        if (backDialog != null && backDialog.isShowing()) return;
        backDialog = new AlertDialog.Builder(this)
                .setTitle(R.string.back_title)
                .setMessage(R.string.back_message)
                .setPositiveButton(R.string.back_stay, (dialog, which) -> immersive())
                // Preserva a WebView e a partida na memória, em vez de destruir a Activity.
                .setNegativeButton(R.string.back_leave, (dialog, which) -> moveTaskToBack(true))
                .create();
        backDialog.setOnDismissListener(dialog -> {
            if (foreground) dispatch("centelha:retomar");
            immersive();
        });
        backDialog.show();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    @SuppressWarnings("deprecation")
    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.systemBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    protected void onDestroy() {
        if (backDialog != null) backDialog.dismiss();
        webView.destroy();
        super.onDestroy();
    }
}

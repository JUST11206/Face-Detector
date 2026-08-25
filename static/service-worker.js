const CACHE_NAME = "smartvision-v1";

const STATIC_FILES = [
    "/",
    "/static/css/style.css",
    "/static/js/script.js",
    "/static/manifest.json"
];


// =========================================================
// INSTALL
// =========================================================

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(
                    cache => {

                        return cache.addAll(
                            STATIC_FILES
                        );

                    }
                )

        );

        self.skipWaiting();

    }
);


// =========================================================
// ACTIVATE
// =========================================================

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(
                    cacheNames => {

                        return Promise.all(

                            cacheNames
                                .filter(
                                    cacheName =>
                                        cacheName !==
                                        CACHE_NAME
                                )
                                .map(
                                    cacheName =>
                                        caches.delete(
                                            cacheName
                                        )
                                )

                        );

                    }
                )

        );

        self.clients.claim();

    }
);


// =========================================================
// FETCH
// =========================================================

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


        // Don't cache POST requests
        // such as /detect

        if (
            request.method !==
            "GET"
        ) {

            return;

        }


        event.respondWith(

            fetch(request)
                .then(
                    response => {

                        // Cache successful responses

                        if (
                            response &&
                            response.status === 200
                        ) {

                            const copy =
                                response.clone();


                            caches
                                .open(
                                    CACHE_NAME
                                )
                                .then(
                                    cache => {

                                        cache.put(
                                            request,
                                            copy
                                        );

                                    }
                                );

                        }


                        return response;

                    }
                )
                .catch(
                    () => {

                        return caches.match(
                            request
                        );

                    }
                )

        );

    }
);
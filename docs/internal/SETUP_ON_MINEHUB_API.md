# Minehub API에 통합 구성
Minehub API에 OpenRSM을 통합 구성하려는 경우, 다음과 같이 NGINX Reverse Proxy를 구성합니다.  


```
upstream minehub_unix_socket {
  server MINEHUB_UPSTREAM fail_timeout=0;
}

upstream minehub_rsm_socket {
  server OPENRSM_UPSTREAM fail_timeout=0;
}

server {

  listen 443 ssl;
  listen [::]:443 ssl;

  server_name api.minehub.kr;

  location ~ ^/v1/servers/([a-f0-9_-]+)/ws/(.+) {
    include conf/stackpath.conf;
    proxy_pass http://minehub_rsm_socket;
    include conf/proxy.conf;
    include conf/ws-proxy.conf;
  }

  location ~ ^/v1/admin/servers/audit {
    include conf/stackpath.conf;
    proxy_pass http://minehub_rsm_socket;
    include conf/proxy.conf;
    include conf/ws-proxy.conf;
  }

  location ~ ^/v1/(admin/|)servers(.+|$) {
    include conf/stackpath.conf;
    proxy_pass http://minehub_rsm_socket;
    include conf/proxy.conf;
  }

  location / {
    include conf/proxy.conf;
    include conf/stackpath.conf;
    proxy_pass http://minehub_unix_socket;
  }
  
...
```
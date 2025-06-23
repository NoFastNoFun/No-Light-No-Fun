package metrics

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Global counters.
var (
	UDPPacketsReceived = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "nolightnofun_udp_packets_total",
			Help: "Total UDP packets received",
		},
	)
	ArtNetPacketsSent = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "nolightnofun_artnet_packets_total",
			Help: "Total Art-Net packets sent",
		},
	)
)

func init() {
	prometheus.MustRegister(UDPPacketsReceived, ArtNetPacketsSent)
}

// Handler exposes the Prometheus scrape endpoint.
func Handler() http.Handler {
	return promhttp.Handler()
}

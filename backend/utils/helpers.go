package utils

import "time"

// ThrottleFPS wraps fn so it runs at most fps times per second.
// fps <= 0 falls back to 25.
func ThrottleFPS(fn func(), fps int) func() {
	if fps <= 0 {
		fps = 25
	}
	delay := time.Second / time.Duration(fps)

	var last time.Time
	var pending bool

	return func() {
		if pending {
			return
		}
		now := time.Now()
		if now.Sub(last) >= delay {
			last = now
			fn()
		} else {
			pending = true
			time.AfterFunc(delay-now.Sub(last), func() {
				pending = false
				last = time.Now()
				fn()
			})
		}
	}
}

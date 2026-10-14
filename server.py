"""
Textile Factory Water & Cost Optimization System
Lightweight Python Local Server with REST API Support
"""

import http.server
import socketserver
import json
import os
import sys

PORT = 5000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class TextileOptimizerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        # Optional REST API endpoint to compute optimization programmatically
        if self.path == '/api/optimize':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode('utf-8'))
                factory = payload.get('factory', {})
                processes = payload.get('processes', [])
                scenario = payload.get('scenario', 'standard')

                multiplier = 1.0
                if scenario == 'advanced':
                    multiplier = 1.35
                elif scenario == 'eco_max':
                    multiplier = 1.70

                total_before = 0
                total_saved = 0
                breakdown = []

                for proc in processes:
                    w_before = float(proc.get('water', 0))
                    total_before += w_before
                    saving_rate = min(0.60, float(proc.get('savingPct', 0.15)) * multiplier)
                    w_saved = round(w_before * saving_rate)
                    w_after = w_before - w_saved
                    total_saved += w_saved

                    breakdown.append({
                        "id": proc.get('id'),
                        "name": proc.get('name'),
                        "waterBefore": w_before,
                        "waterAfter": w_after,
                        "waterSaved": w_saved,
                        "savingPct": round((w_saved / (w_before or 1)) * 100),
                        "recommendation": proc.get('recommendation', 'Optimize process water flow'),
                        "priority": proc.get('priority', 'Medium')
                    })

                total_after = total_before - total_saved
                reduction_pct = round((total_saved / total_before * 100), 1) if total_before > 0 else 0
                
                water_cost = float(factory.get('waterCost', 50))
                working_days = float(factory.get('workingDays', 26))
                
                cost_per_liter = water_cost / 1000.0
                daily_cost_saving = total_saved * cost_per_liter
                monthly_cost_saving = round(daily_cost_saving * working_days)
                annual_cost_saving = round(monthly_cost_saving * 12)

                response = {
                    "status": "success",
                    "totalBefore": total_before,
                    "totalAfter": total_after,
                    "totalSaved": total_saved,
                    "reductionPct": reduction_pct,
                    "monthlyCostSaving": monthly_cost_saving,
                    "annualCostSaving": annual_cost_saving,
                    "breakdown": breakdown
                }

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return

        return super().do_POST()

    def end_headers(self):
        # Enable CORS and disable aggressive caching for local dev
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), TextileOptimizerHandler) as httpd:
        print("=" * 65)
        print(f" Textile Water & Cost Optimizer Web Server Running")
        print(f" Local Address: http://localhost:{PORT}")
        print("=" * 65)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.server_close()

if __name__ == '__main__':
    run_server()

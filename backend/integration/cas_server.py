import json
import secrets
from html import escape
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlencode, urlsplit


class CASHandler(BaseHTTPRequestHandler):
    tickets = {}

    def log_message(self, *args):
        pass  # Do not log service tickets or credentials.

    def reply(self, status, body='', content_type='text/html', location=None):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        if location:
            self.send_header('Location', location)
        self.end_headers()
        self.wfile.write(body.encode())

    def do_GET(self):
        parsed = urlsplit(self.path)
        params = parse_qs(parsed.query)
        if parsed.path == '/cas/login':
            self.reply(200, '<form method="post"><input name="username">'
                       '<input name="password" type="password"><button>Login</button></form>')
        elif parsed.path == '/cas/serviceValidate':
            ticket = params.get('ticket', [''])[0]
            service = params.get('service', [''])[0]
            issued = self.tickets.pop(ticket, None)
            if issued and issued['service'] == service:
                result = ('<cas:authenticationSuccess><cas:user>'
                          f'{escape(issued["username"])}'
                          '</cas:user></cas:authenticationSuccess>')
            else:
                result = ('<cas:authenticationFailure code="INVALID_TICKET">'
                          'Invalid, consumed, or wrong-service ticket.'
                          '</cas:authenticationFailure>')
            self.reply(200, '<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">'
                       f'{result}</cas:serviceResponse>', 'application/xml')
        else:
            self.reply(404)

    def do_POST(self):
        parsed = urlsplit(self.path)
        body = self.rfile.read(int(self.headers.get('Content-Length', '0')))
        if parsed.path == '/cas/login':
            params = parse_qs(body.decode())
            username = params.get('username', [''])[0]
            password = params.get('password', [''])[0]
            service = parse_qs(parsed.query).get('service', [''])[0]
            if username not in ('alice', 'bob') or password != 'test-only-password':
                self.reply(403)
                return
            if not service.startswith('https://'):
                self.reply(400)
                return
            ticket = 'ST-' + secrets.token_urlsafe(24)
            self.tickets[ticket] = {'username': username, 'service': service}
            separator = '&' if '?' in service else '?'
            self.reply(302, location=service + separator + urlencode({'ticket': ticket}))
        elif parsed.path == '/v2/people':
            if self.headers.get('Authorization') != 'Bearer test-only-yalies-key':
                self.reply(403)
                return
            username = json.loads(body)['query']
            self.reply(200, json.dumps([{
                'first_name': username.title(), 'last_name': 'Test',
                'email': f'{username}@yale.edu',
            }]), 'application/json')
        else:
            self.reply(404)


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8080), CASHandler)
    print('CAS fixture ready', flush=True)
    server.serve_forever()

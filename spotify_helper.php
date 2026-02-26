<?php
class SpotifyHelper {
    private $clientId = '8ea2308ed268479c867ca2fea1d06bd7';
    private $clientSecret = '91b2c12968d446cf84f7cf955d10532a';
    private $accessToken = null;

    private function getAccessToken() {
        if ($this->accessToken) return $this->accessToken;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://accounts.spotify.com/api/token');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Authorization: Basic ' . base64_encode($this->clientId . ':' . $this->clientSecret),
            'Content-Type: application/x-www-form-urlencoded'
        ));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $result = curl_exec($ch);
        if ($result === false) {
            error_log('Spotify Auth Curl Error: ' . curl_error($ch));
        }
        curl_close($ch);

        $data = json_decode($result, true);
        if (isset($data['access_token'])) {
            $this->accessToken = $data['access_token'];
            return $this->accessToken;
        } else {
            error_log('Spotify Auth Error: ' . print_r($data, true));
        }

        return null;
    }

    public function searchTracks($query) {
        $token = $this->getAccessToken();
        if (!$token) return [];

        $ch = curl_init();
        $url = 'https://api.spotify.com/v1/search?q=' . urlencode($query) . '&type=track&limit=20';
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Authorization: Bearer ' . $token
        ));

        $result = curl_exec($ch);
        if ($result === false) {
            error_log('Spotify Search Curl Error: ' . curl_error($ch));
        }
        curl_close($ch);

        $data = json_decode($result, true);
        return $data['tracks']['items'] ?? [];
    }
}
?>

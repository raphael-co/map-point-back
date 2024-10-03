# Documentation des Routes des Amis

## Routes pour les Amis

### 1. Envoyer une Demande d'Ami

**URL**: `https://map-point.netgraph.fr/api/friends/send-request`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "friendId": 2
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "Friend request sent successfully"
}
```

---

### 2. Accepter une Demande d'Ami

**URL**: `https://map-point.netgraph.fr/api/friends/accept-request`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "friendId": 2
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "Friend request accepted successfully"
}
```

---

### 3. Rejeter une Demande d'Ami

**URL**: `https://map-point.netgraph.fr/api/friends/reject-request`  
**Méthode**: DELETE  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "friendId": 2
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "Friend request rejected successfully"
}
```

---

### 4. Lister les Suivis (Following)

**URL**: `https://map-point.netgraph.fr/api/friends/listFollowing/:userId`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "following": [
        {
            "id": 1,
            "username": "user1",
            "gender": "male",
            "last_login": "2023-10-01T12:00:00Z",
            "followed_at": "2023-09-30T12:00:00Z",
            "status": "accepted"
        }
    ]
}
```

---

### 5. Lister les Suiveurs (Followers)

**URL**: `https://map-point.netgraph.fr/api/friends/listFollowers/:userId`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "followers": [
        {
            "id": 2,
            "username": "user2",
            "gender": "female",
            "last_login": "2023-10-02T14:00:00Z",
            "followed_at": "2023-09-30T12:00:00Z",
            "status": "accepted"
        }
    ]
}
```

---

### 6. Lister les Demandes d'Ami en Attente

**URL**: `https://map-point.netgraph.fr/api/friends/friend-requests`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "friendRequests": [
        {
            "id": 3,
            "username": "user3",
            "email": "user3@example.com",
            "gender": "other",
            "joined_at": "2023-09-20T10:00:00Z",
            "last_login": "2023-10-01T12:00:00Z",
            "requested_at": "2023-09-30T12:00:00Z"
        }
    ]
}
```

---

# Explications Générales

1. **Envoyer une Demande d'Ami**: Un utilisateur authentifié peut envoyer une demande d'ami à un autre utilisateur. Si une demande est déjà en attente ou si l'utilisateur est déjà suivi, une erreur sera renvoyée.
2. **Accepter une Demande d'Ami**: L'utilisateur peut accepter une demande d'ami en attente.
3. **Rejeter une Demande d'Ami**: L'utilisateur peut rejeter une demande d'ami en attente.
4. **Lister les Suivis**: Permet de récupérer la liste des utilisateurs suivis par un utilisateur donné.
5. **Lister les Suiveurs**: Permet de récupérer la liste des utilisateurs qui suivent un utilisateur donné.
6. **Lister les Demandes d'Ami en Attente**: Permet de récupérer la liste des demandes d'ami en attente pour l'utilisateur authentifié.

Chaque route nécessite un jeton JWT valide à passer dans le header d'autorisation pour authentifier l'utilisateur.
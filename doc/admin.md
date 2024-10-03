# Documentation des Routes Admin

## Routes pour les Marqueurs

### 1. Obtenir tous les Marqueurs

**URL**: `https://map-point.netgraph.fr/api/admin/markers`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "data": [
        {
            "id": 1,
            "user_id": 123,
            "title": "Sample Marker",
            "description": "Description",
            "latitude": 48.8584,
            "longitude": 2.2945,
            "type": "type",
            "visibility": "public",
            "blocked": false,
            "images": [
                {
                    "url": "image_url"
                }
            ]
        }
    ]
}
```

---

### 2. Obtenir un Marqueur par ID

**URL**: `https://map-point.netgraph.fr/api/admin/markers/:id`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "data": {
        "id": 1,
        "title": "Sample Marker",
        "description": "Description",
        "latitude": 48.8584,
        "longitude": 2.2945,
        "type": "type",
        "visibility": "public",
        "blocked": false,
        "images": [
            {
                "url": "image_url"
            }
        ]
    }
}
```

---

### 3. Mettre à jour un Marqueur

**URL**: `https://map-point.netgraph.fr/api/admin/update/:id`  
**Méthode**: PUT  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "title": "Updated Marker Title",
    "description": "Updated Description",
    "latitude": 48.8584,
    "longitude": 2.2945,
    "type": "new_type",
    "visibility": "public"
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "Marker updated successfully"
}
```

---

### 4. Supprimer un Marqueur

**URL**: `https://map-point.netgraph.fr/api/admin/markers/:id`  
**Méthode**: DELETE  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "message": "Marker deleted successfully"
}
```

---

### 5. Supprimer plusieurs Marqueurs

**URL**: `https://map-point.netgraph.fr/api/admin/markers/delete-multiple`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "ids": [1, 2, 3]
}
```

**Réponse Possible**:

```json
{
    "message": "3 markers deleted successfully"
}
```

---

## Routes pour les Utilisateurs

### 1. Obtenir tous les Utilisateurs

**URL**: `https://map-point.netgraph.fr/api/admin/users`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "users": [
        {
            "id": 1,
            "username": "user1",
            "email": "user1@example.com",
            "role": "user"
        }
    ]
}
```

---

### 2. Obtenir un Utilisateur par ID

**URL**: `https://map-point.netgraph.fr/api/admin/users/:id`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "id": 1,
    "username": "user1",
    "email": "user1@example.com",
    "role": "user"
}
```

---

### 3. Mettre à jour le Rôle d'un Utilisateur

**URL**: `https://map-point.netgraph.fr/api/admin/users/:id/role`  
**Méthode**: PATCH  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "role": "admin"
}
```

**Réponse Possible**:

```json
{
    "message": "User role updated successfully"
}
```

---

### 4. Bloquer/Débloquer un Utilisateur

**URL**: `https://map-point.netgraph.fr/api/admin/users/:id/blocked`  
**Méthode**: PATCH  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "blocked": true
}
```

**Réponse Possible**:

```json
{
    "message": "User blocked successfully"
}
```

---

### 5. Supprimer un Utilisateur

**URL**: `https://map-point.netgraph.fr/api/admin/users/:id`  
**Méthode**: DELETE  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "message": "User deleted successfully"
}
```

---

## Routes pour les Annonces

### 1. Obtenir toutes les Annonces avec Pagination

**URL**: `https://map-point.netgraph.fr/api/admin/announcements`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Query Parameters**:  
- page: numéro de la page (par défaut: 1)  
- size: taille de la page (par défaut: 10)  
- search: recherche par titre ou contenu  
- sortColumn: colonne à trier (par défaut: `created_at`)  
- sortOrder: ordre de tri (`ASC` ou `DESC`)

**Réponse Possible**:

```json
{
    "status": "success",
    "data": [
        {
            "id": 1,
            "title": "Annonce 1",
            "author_id": 123,
            "created_at": "2023-01-01",
            "content": "Contenu de l'annonce"
        }
    ],
    "meta": {
        "totalAnnouncements": 100,
        "totalPages": 10,
        "currentPage": 1,
        "pageSize": 10
    }
}
```

---

## Routes pour les Statistiques des Utilisateurs

### 1. Obtenir le Nombre Total d'Utilisateurs

**URL**: `https://map-point.netgraph.fr/api/admin/stats/total-users`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "totalUsers": 1000
}
```

---

### 2. Obtenir les Nouveaux Utilisateurs

**URL**: `https://map-point.netgraph.fr/api/admin/stats/new-users`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "newUsers": 50
}
```

---

### 3. Obtenir les Utilisateurs Actifs

**URL**: `https://map-point.netgraph.fr/api/admin/stats/active-users`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "activeUsers": 300
}
```

---

## Routes pour les Statistiques des Marqueurs

### 1. Obtenir le Nombre Total de Marqueurs

**URL**: `https://map-point.netgraph.fr/api/admin/stats/total-markers`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "totalMarkers": 500
}
```

---

### 2. Obtenir le Nombre de Marqueurs Bloqués

**URL**: `https://map-point.netgraph.fr/api/admin/stats/blocked-markers`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "blockedMarkers": 50
}
```

---

### 3. Obtenir les Marqueurs par Mois et Année

**URL**: `https://map-point.netgraph.fr/api/admin/stats/markers-by-month-year`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "2023": [
        {
            "label": "January",
            "value": 30
        },
        {
            "label": "February",
            "value": 25
        }
    ]
}
```

---

### 4. Obtenir les Marqueurs par Période

**URL**: `https://map-point.netgraph.fr/api/admin/stats/markers-by-period`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Query

 Parameters**:  
- period: `year`, `month`, `week`, `day`  
- year: l'année  
- month: le mois (1-12)  
- day: le jour

**Réponse Possible**:

```json
{
    "2023-01": [
        {
            "label": "Monday",
            "value": 5
        },
        {
            "label": "Tuesday",
            "value": 8
        }
    ]
}
```

---

## Routes pour les Statistiques des Commentaires

### 1. Obtenir les Commentaires par Mois et Année

**URL**: `https://map-point.netgraph.fr/api/admin/stats/comments-by-month-year`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "2023": [
        {
            "label": "January",
            "value": 15
        },
        {
            "label": "February",
            "value": 20
        }
    ]
}
```

---

### 2. Obtenir les Commentaires par Période

**URL**: `https://map-point.netgraph.fr/api/admin/stats/comments-by-period`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Query Parameters**:  
- period: `year`, `month`, `week`, `day`  
- year: l'année  
- month: le mois (1-12)  
- day: le jour

**Réponse Possible**:

```json
{
    "2023-01-01": [
        {
            "label": "10:00",
            "value": 2
        },
        {
            "label": "11:00",
            "value": 3
        }
    ]
}
```

Chaque route nécessite un jeton JWT valide avec un role admin minimum à passer dans le header d'autorisation pour authentifier l'utilisateur.
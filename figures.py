"""
Publication-quality figures for:
"Концептуальна картографія у просторі ПРН: між compliance-адаптацією та когнітивною ієрархією"

Requires: matplotlib, numpy, scipy, seaborn
Install: pip install matplotlib numpy scipy seaborn
Run:     python figures.py
Output:  fig1_socratic.png, fig2_overconfidence.png,
         fig3_homophily.png, fig4_s4_radar.png,
         fig5_corr_heatmap.png, fig6_hypotheses.png
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch
import matplotlib.gridspec as gridspec
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# ── APA-style global settings ──────────────────────────────────────────────
plt.rcParams.update({
    'font.family': 'DejaVu Sans',
    'font.size': 10,
    'axes.titlesize': 11,
    'axes.labelsize': 10,
    'xtick.labelsize': 9,
    'ytick.labelsize': 9,
    'axes.spines.top': False,
    'axes.spines.right': False,
    'axes.linewidth': 0.8,
    'xtick.major.width': 0.8,
    'ytick.major.width': 0.8,
    'figure.dpi': 300,
    'savefig.dpi': 300,
    'savefig.bbox': 'tight',
    'savefig.facecolor': 'white',
})

# Colorblind-safe palette (Wong 2011)
C_BLUE    = '#0072B2'
C_ORANGE  = '#E69F00'
C_GREEN   = '#009E73'
C_RED     = '#D55E00'
C_PURPLE  = '#CC79A7'
C_LBLUE   = '#56B4E9'
C_YELLOW  = '#F0E442'
C_GREY    = '#999999'

# ── Data ───────────────────────────────────────────────────────────────────
ids       = [1,   2,    3,    4,    5,     6,     7,    8,    9    ]
gpa       = [94,  93,   89,   93,   93.8,  88.51, 93,   90,   82.11]
density   = [1.0, 1.0,  1.0,  0.187,1.0,   1.0,   1.0,  1.0,  0.835]
wgd       = [0.729,0.630,0.740,0.077,0.612, 0.601, 0.582,0.451,0.564]
avg_w     = [2.19, 1.89, 2.22, 1.24, 1.84,  1.80,  1.75, 1.35, 2.03 ]
ew_sd     = [0.824,0.777,0.708,0.424,0.715, 0.828, 0.735,0.581,0.743]
avg_rat   = [5.36, 5.14, 4.71, 6.71, 5.64,  5.71,  4.71, 5.71, 5.71 ]
sd_rat    = [1.17, 0.91, 1.10, 0.45, 0.89,  1.10,  1.67, 1.16, 0.59 ]
bridge    = [0.822,0.968,0.948,0.120,0.913, 0.820, 0.770,0.960,0.613]
pt_sec    = [45.5, 20.6, 29.2, 114.8,152.0, 77.5,  25.4, 166.6,50.0 ]
intra_avg = [2.89, 2.61, 2.36, 1.36, 2.36,  2.37,  2.08, 1.95, 2.36 ]
inter_avg = [2.00, 1.71, 2.16, 1.00, 1.60,  1.65,  1.62, 1.18, 1.86 ]
homophily = [0.89, 0.90, 0.20, 0.36, 0.75,  0.72,  0.46, 0.77, 0.50 ]
n_edges   = [91,   91,   91,   17,   91,    91,    91,   91,   76   ]

ids       = np.array(ids)
gpa       = np.array(gpa)
density   = np.array(density)
wgd       = np.array(wgd)
avg_w     = np.array(avg_w)
ew_sd     = np.array(ew_sd)
avg_rat   = np.array(avg_rat)
sd_rat    = np.array(sd_rat)
bridge    = np.array(bridge)
pt_sec    = np.array(pt_sec)
intra_avg = np.array(intra_avg)
inter_avg = np.array(inter_avg)
homophily = np.array(homophily)
n_edges   = np.array(n_edges)

# S4 index
S4 = 3  # 0-based

def spearman_r(x, y):
    r, p = stats.spearmanr(x, y)
    return r, p

def format_rho(r, p, n):
    stars = ''
    if p < .001: stars = '***'
    elif p < .01: stars = '**'
    elif p < .05: stars = '*'
    return f'ρ = {r:+.2f}{stars} (N={n})'


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 1 — Socratic effect: WGD vs. average self-rating
# ═══════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(5.5, 4.5))

colors = [C_RED if i == S4 else C_BLUE for i in range(len(ids))]
sizes  = [120 if i == S4 else 70 for i in range(len(ids))]

for i in range(len(ids)):
    ax.scatter(wgd[i], avg_rat[i], s=sizes[i], color=colors[i],
               zorder=3, edgecolors='white', linewidths=0.5)
    # label all points
    offset = (0.005, 0.06) if i != S4 else (0.005, -0.12)
    ax.annotate(f'S{ids[i]}', (wgd[i], avg_rat[i]),
                xytext=(wgd[i]+offset[0], avg_rat[i]+offset[1]),
                fontsize=8, color=colors[i], fontweight='bold' if i==S4 else 'normal')

# Trend line (all)
z = np.polyfit(wgd, avg_rat, 1)
p_line = np.poly1d(z)
x_range = np.linspace(min(wgd)-0.02, max(wgd)+0.02, 100)
ax.plot(x_range, p_line(x_range), '--', color=C_GREY, linewidth=1.2, alpha=0.7, label='Лінія тренду')

# Trend line excluding S4
mask = ids != 4
z2 = np.polyfit(wgd[mask], avg_rat[mask], 1)
p2 = np.poly1d(z2)
ax.plot(x_range, p2(x_range), '-', color=C_BLUE, linewidth=1.2, alpha=0.6, label='Тренд без S4')

r_all, p_all = spearman_r(wgd, avg_rat)
r_ex,  p_ex  = spearman_r(wgd[mask], avg_rat[mask])

ax.set_xlabel('Зважена графова щільність (WGD)', fontsize=10)
ax.set_ylabel('Середня самооцінка компетентності (1–7)', fontsize=10)
ax.set_title('Рис. 1. Сократичний ефект:\nбільша інтеграція карти → нижча самооцінка', fontsize=11, pad=10)

info = (f'Всі: {format_rho(r_all, p_all, len(ids))}\n'
        f'Без S4: {format_rho(r_ex, p_ex, mask.sum())}')
ax.text(0.03, 0.97, info, transform=ax.transAxes,
        va='top', fontsize=8.5, color='#333333',
        bbox=dict(boxstyle='round,pad=0.4', facecolor='#f5f5f5', edgecolor='#cccccc', linewidth=0.6))

# Annotate S4
ax.annotate('S4\n(Dunning–Kruger\noutlier)',
            xy=(wgd[S4], avg_rat[S4]),
            xytext=(0.15, 6.50),
            fontsize=8, color=C_RED,
            arrowprops=dict(arrowstyle='->', color=C_RED, lw=1.2))

red_dot   = mpatches.Patch(color=C_RED,  label='S4 (outlier)')
blue_dot  = mpatches.Patch(color=C_BLUE, label='Решта учасників')
ax.legend(handles=[blue_dot, red_dot], fontsize=8.5, frameon=False)

ax.set_ylim(4.0, 7.3)
ax.set_xlim(-0.02, 0.82)
plt.tight_layout()
plt.savefig('fig1_socratic.png')
plt.close()
print('OK fig1_socratic.png')


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 2 — Overconfidence penalty: avg self-rating vs. perturbation time
# ═══════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(5.5, 4.5))

# S9 excluded from time analysis (session anomaly ~18h)
# Keep all 9 for the correlation but annotate S9
colors2 = [C_RED if i==S4 else C_GREY if i==8 else C_ORANGE for i in range(len(ids))]

for i in range(len(ids)):
    ax.scatter(avg_rat[i], pt_sec[i], s=80, color=colors2[i],
               zorder=3, edgecolors='white', linewidths=0.5)
    offset_y = 5 if i != S4 else -14
    ax.annotate(f'S{ids[i]}', (avg_rat[i], pt_sec[i]),
                xytext=(avg_rat[i]+0.03, pt_sec[i]+offset_y),
                fontsize=8, color=colors2[i], fontweight='bold' if i==S4 else 'normal')

# Regression line
z3 = np.polyfit(avg_rat, pt_sec, 1)
p3 = np.poly1d(z3)
x3 = np.linspace(min(avg_rat)-0.1, max(avg_rat)+0.1, 100)
ax.plot(x3, p3(x3), '--', color=C_GREY, linewidth=1.2, alpha=0.7)

r3, p3v = spearman_r(avg_rat, pt_sec)

ax.set_xlabel('Середня самооцінка компетентності (1–7)', fontsize=10)
ax.set_ylabel('Середній час пертурбаційного рішення (с)', fontsize=10)
ax.set_title('Рис. 2. Штраф за впевненість:\nвища самооцінка → довше рішення при пертурбації', fontsize=11, pad=10)

ax.text(0.03, 0.97, format_rho(r3, p3v, len(ids)),
        transform=ax.transAxes, va='top', fontsize=8.5, color='#333333',
        bbox=dict(boxstyle='round,pad=0.4', facecolor='#f5f5f5', edgecolor='#cccccc', linewidth=0.6))

ax.annotate('S4: швидкий,\nнайнижча точність\n(bridge = 0.12)',
            xy=(avg_rat[S4], pt_sec[S4]),
            xytext=(6.3, 135),
            fontsize=8, color=C_RED,
            arrowprops=dict(arrowstyle='->', color=C_RED, lw=1.2))

ax.annotate('S9\n(сесія з перервою)',
            xy=(avg_rat[8], pt_sec[8]),
            xytext=(5.1, 60),
            fontsize=7.5, color=C_GREY,
            arrowprops=dict(arrowstyle='->', color=C_GREY, lw=0.8))

plt.tight_layout()
plt.savefig('fig2_overconfidence.png')
plt.close()
print('✓ fig2_overconfidence.png')


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 3 — Cluster homophily: intra vs inter edge weights per student
# ═══════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(7, 4.5))

x = np.arange(len(ids))
width = 0.35

bars_intra = ax.bar(x - width/2, intra_avg, width, label='Внутрішньокластерні ребра',
                    color=C_BLUE, alpha=0.85, edgecolor='white', linewidth=0.5)
bars_inter = ax.bar(x + width/2, inter_avg, width, label='Міжкластерні ребра',
                    color=C_LBLUE, alpha=0.85, edgecolor='white', linewidth=0.5)

# Annotate homophily delta
for i in range(len(ids)):
    delta = intra_avg[i] - inter_avg[i]
    ymax = max(intra_avg[i], inter_avg[i])
    ax.annotate(f'Δ={delta:.2f}',
                xy=(x[i], ymax + 0.05),
                ha='center', fontsize=7.5,
                color=C_RED if i==S4 else '#444444',
                fontweight='bold' if i==S4 else 'normal')

# Highlight S4
ax.axvspan(x[S4] - 0.5, x[S4] + 0.5, alpha=0.08, color=C_RED, zorder=0)
ax.text(x[S4], 0.05, 'S4', ha='center', fontsize=8, color=C_RED, fontweight='bold')

ax.set_xticks(x)
ax.set_xticklabels([f'S{i}' for i in ids], fontsize=9)
ax.set_xlabel('Учасник', fontsize=10)
ax.set_ylabel('Середня вага ребра (1–3)', fontsize=10)
ax.set_title('Рис. 3. Кластерний гомофілій:\nусі учасники надають вищі ваги внутрішньокластерним зв\'язкам', fontsize=11, pad=10)
ax.set_ylim(0, 3.5)
ax.axhline(y=1, color=C_GREY, linewidth=0.6, linestyle=':', alpha=0.5)
ax.axhline(y=2, color=C_GREY, linewidth=0.6, linestyle=':', alpha=0.5)
ax.axhline(y=3, color=C_GREY, linewidth=0.6, linestyle=':', alpha=0.5)
ax.legend(fontsize=9, frameon=False)

plt.tight_layout()
plt.savefig('fig3_homophily.png')
plt.close()
print('✓ fig3_homophily.png')


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 4 — S4 radar: outlier profile vs. group median
# ═══════════════════════════════════════════════════════════════════════════
# Metrics normalized to 0–1 (higher = more extreme in the "typical" direction)
# Variables: density, wgd, bridge_acc, avg_rating (inv), ew_sd, n_decision_speed (inv)

# Normalize each variable 0–1 across all participants
def norm01(arr):
    mn, mx = arr.min(), arr.max()
    if mx == mn: return np.zeros_like(arr, dtype=float)
    return (arr - mn) / (mx - mn)

decision_ms = np.array([50979, 18339, 28014, 10554, 98598, 77879, 39202, 32623, 41601])
# Speed = inverse of decision_ms (faster = higher value)
speed = 1 / decision_ms

vars_labels = ['Щільність\n(density)', 'Інтеграція\n(WGD)', 'Bridge\nAccuracy',
               'Самооцінка\n(інверт.)', 'Ієрархічність\n(SD ваг)', 'Швидкість\nрішень']

raw = np.column_stack([
    density,
    wgd,
    bridge,
    1 - norm01(avg_rat),   # inverted: low self-rating = high on this axis
    ew_sd,
    norm01(speed)           # already normalized
])

# Normalize all columns 0–1
data_norm = np.apply_along_axis(lambda col: (col-col.min())/(col.max()-col.min()) if col.max()!=col.min() else col, 0, raw)

# S4 vs median of rest
s4_vals  = data_norm[S4]
rest_med = np.median(data_norm[np.arange(len(ids)) != S4], axis=0)

N_vars = len(vars_labels)
angles = np.linspace(0, 2*np.pi, N_vars, endpoint=False).tolist()
angles += angles[:1]  # close the loop

s4_plot   = s4_vals.tolist()   + s4_vals[:1].tolist()
rest_plot = rest_med.tolist()  + rest_med[:1].tolist()

fig, ax = plt.subplots(figsize=(5.5, 5.5), subplot_kw=dict(polar=True))

ax.plot(angles, s4_plot,   'o-', linewidth=2, color=C_RED,  label='S4 (outlier)', markersize=5)
ax.fill(angles, s4_plot,   alpha=0.20, color=C_RED)
ax.plot(angles, rest_plot, 's--',linewidth=1.5, color=C_BLUE, label='Медіана решти (S1–S3, S5–S9)', markersize=4)
ax.fill(angles, rest_plot, alpha=0.10, color=C_BLUE)

ax.set_xticks(angles[:-1])
ax.set_xticklabels(vars_labels, size=8.5)
ax.set_ylim(0, 1)
ax.set_yticks([0.25, 0.5, 0.75])
ax.set_yticklabels(['0.25', '0.50', '0.75'], size=7, color=C_GREY)
ax.set_title('Рис. 4. Профіль S4 vs. медіана групи\n(нормовані значення)', fontsize=11, pad=20)
ax.legend(loc='upper right', bbox_to_anchor=(1.35, 1.15), fontsize=8.5, frameon=False)
ax.grid(color=C_GREY, linestyle='--', linewidth=0.5, alpha=0.5)
ax.spines['polar'].set_visible(False)

plt.tight_layout()
plt.savefig('fig4_s4_radar.png')
plt.close()
print('✓ fig4_s4_radar.png')


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 5 — Correlation heatmap (key variables)
# ═══════════════════════════════════════════════════════════════════════════
import itertools

var_names = ['GPA', 'Density', 'WGD', 'avgWeight', 'edgeWeightSD',
             'avgRating', 'bridgeAcc', 'perturbTime', 'homophily']
data_matrix = np.column_stack([gpa, density, wgd, avg_w, ew_sd,
                                avg_rat, bridge, pt_sec, homophily])

n_vars = len(var_names)
corr_matrix = np.zeros((n_vars, n_vars))
pval_matrix = np.ones((n_vars, n_vars))

for i, j in itertools.product(range(n_vars), range(n_vars)):
    if i == j:
        corr_matrix[i, j] = 1.0
    else:
        r, p = stats.spearmanr(data_matrix[:, i], data_matrix[:, j])
        corr_matrix[i, j] = r
        pval_matrix[i, j] = p

fig, ax = plt.subplots(figsize=(7.5, 6.5))

# Custom diverging colormap
from matplotlib.colors import TwoSlopeNorm
norm = TwoSlopeNorm(vmin=-1, vcenter=0, vmax=1)
im = ax.imshow(corr_matrix, cmap='RdBu_r', norm=norm, aspect='auto')

# Annotate cells
for i in range(n_vars):
    for j in range(n_vars):
        r = corr_matrix[i, j]
        p = pval_matrix[i, j]
        txt = f'{r:.2f}'
        star = '**' if p < .01 else '*' if p < .05 else ''
        color = 'white' if abs(r) > 0.65 else 'black'
        ax.text(j, i, txt + star, ha='center', va='center',
                fontsize=7.5, color=color, fontweight='bold' if abs(r) > 0.5 else 'normal')

ax.set_xticks(range(n_vars))
ax.set_yticks(range(n_vars))
ax.set_xticklabels(var_names, rotation=35, ha='right', fontsize=8.5)
ax.set_yticklabels(var_names, fontsize=8.5)
ax.set_title('Рис. 5. Матриця рангових кореляцій Спірмена (N = 9)\n* p < .05, ** p < .01 (непоправлені)', fontsize=11, pad=10)

cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
cbar.set_label('Коефіцієнт ρ', fontsize=9)
cbar.ax.tick_params(labelsize=8)

plt.tight_layout()
plt.savefig('fig5_corr_heatmap.png')
plt.close()
print('✓ fig5_corr_heatmap.png')


# ═══════════════════════════════════════════════════════════════════════════
# FIGURE 6 — Hypothesis summary: observed vs. expected rho
# ═══════════════════════════════════════════════════════════════════════════
hyp_labels = [
    'H1a: GPA → WGD\n(очік. ≈ 0)',
    'H1b: GPA → density\n(очік. +)',
    'H1c: GPA → avgWeight\n(очік. −)',
    'H2: density → avgWeight\n(очік. −)',
    'H3: GPA → edgeWeightSD\n(очік. −)',
    'H5: edgeWeightSD → bridge\n(очік. +)',
    'EDA: WGD → avgRating\n(дослідниц.)',
    'EDA: avgRating → perturbT\n(дослідниц.)',
]

obs_rho    = [0.267, 0.433, -0.033, 0.433, -0.017, 0.050, -0.704, 0.762]
exp_rho    = [0.0,   0.5,   -0.5,   -0.5,  -0.5,   0.5,   None,   None ]

colors_bar = []
for obs, exp in zip(obs_rho, exp_rho):
    if exp is None:
        colors_bar.append(C_GREEN)   # exploratory
    elif exp == 0:
        colors_bar.append(C_BLUE if abs(obs) < 0.3 else C_ORANGE)
    elif np.sign(obs) == np.sign(exp):
        colors_bar.append(C_BLUE)    # confirmed direction
    else:
        colors_bar.append(C_RED)     # opposite direction

fig, ax = plt.subplots(figsize=(8, 5))

x = np.arange(len(hyp_labels))
bars = ax.barh(x, obs_rho, color=colors_bar, alpha=0.85, edgecolor='white', height=0.6)

# Expected direction arrows / symbols
for i, (obs, exp) in enumerate(zip(obs_rho, exp_rho)):
    if exp is not None:
        exp_sign = '+' if exp > 0 else ('−' if exp < 0 else '≈0')
        ax.text(max(obs, 0) + 0.02 if obs >= 0 else min(obs, 0) - 0.03,
                i, f'(очік. {exp_sign})',
                va='center', ha='left' if obs >= 0 else 'right',
                fontsize=7.5, color='#555555', style='italic')

ax.axvline(0, color='black', linewidth=0.8)
ax.axvline(-0.5, color=C_GREY, linewidth=0.5, linestyle=':', alpha=0.5)
ax.axvline(0.5, color=C_GREY, linewidth=0.5, linestyle=':', alpha=0.5)

for i, (bar, obs) in enumerate(zip(bars, obs_rho)):
    xpos = obs + (0.015 if obs >= 0 else -0.015)
    ha = 'left' if obs >= 0 else 'right'
    ax.text(xpos, i, f'{obs:+.3f}', va='center', ha=ha, fontsize=8.5, fontweight='bold')

ax.set_yticks(x)
ax.set_yticklabels(hyp_labels, fontsize=8.5)
ax.set_xlabel('Коефіцієнт Спірмена ρ', fontsize=10)
ax.set_title('Рис. 6. Підсумок гіпотез: спостережувані кореляції\n(синій = підтверджено, червоний = протилежний знак, зелений = дослідниц.)', fontsize=11, pad=10)
ax.set_xlim(-1.0, 1.0)

legend_patches = [
    mpatches.Patch(color=C_BLUE,   label='Підтверджено напрямок / H1a ≈ 0'),
    mpatches.Patch(color=C_RED,    label='Протилежний знак (H2)'),
    mpatches.Patch(color=C_GREEN,  label='Дослідницька знахідка (EDA)'),
    mpatches.Patch(color=C_ORANGE, label='Незначний ефект (H1a)'),
]
ax.legend(handles=legend_patches, fontsize=8, frameon=False, loc='lower right')

plt.tight_layout()
plt.savefig('fig6_hypotheses.png')
plt.close()
print('✓ fig6_hypotheses.png')

print('\nAll figures saved. Run: python figures.py')
print('Files: fig1_socratic.png, fig2_overconfidence.png, fig3_homophily.png,')
print('       fig4_s4_radar.png, fig5_corr_heatmap.png, fig6_hypotheses.png')
